# Laminar Open API

A Library for building OpenApi backed REST APIs. Automatic validation of request / response based on the api schema.
Generate TypeScript types using a cli.

**EXPERIMENTAL**

## Usage

```typescript
import { laminar } from '@ovotech/laminar';
import { oapi, loadYamlFile } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const start = async () => {
  const app = await oapi<Config>({
    api: loadYamlFile(join(__dirname, 'simple.yaml')),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  createServer(laminar(app)).listen(8080, () => {
    console.log('Server started');
  });
};

start();
```

For a OpenApi specification of `simple.yaml`:

```yaml
openapi: '3.0.0'
info:
  title: 'Simple Example'
  version: 1.0.0
paths:
  /user/{id}:
    get:
      parameters:
        - name: 'id'
          in: 'path'
          required: true
          schema:
            type: 'string'
            pattern: '\d+'
      responses:
        200:
          description: 'User'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
components:
  schemas:
    UserResponse:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

This would validate both the request and the response, making sure your code receives only valid requests and that your clients will only get the responses specified in the schema.

## Security

If you have this schema:

```yaml
openapi: '3.0.0'
info:
  title: 'Security Example'
  version: 1.0.0
paths:
  /user/{id}:
    get:
      security: [{ JWT: [] }]
      parameters:
        - name: 'id'
          in: 'path'
          required: true
          schema:
            type: 'string'
            pattern: '\d+'
      responses:
        200:
          description: 'User'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
components:
  securitySchemes:
    JWT:
      type: http
      scheme: bearer
  schemas:
    UserResponse:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

You can then implement the security with:

```typescript
import { laminar } from '@ovotech/laminar';
import { oapi } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const start = async () => {
  const app = await oapi({
    api: loadYamlFile(join(__dirname, 'security.yaml')),
    security: {
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  createServer(laminar(app)).listen(8080, () => console.log('Server started'));
};

start();
```

## Generating types

To generate a typescript types out of the OpenApi schema, run:

```shell
yarn laminar-oapi convert <path to schema> --output-file <output path>
```

After that you can add the type with `oapi<Config>`, which will add types to both requests and responses.

```typescript
import { laminar } from '@ovotech/laminar';
import { oapi, loadYamlFile } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';
import { Config } from './__generated__/schema';

const findUser = (id: string) => ({ id, name: 'John' });

const start = async () => {
  const app = await oapi<Config>({
    api: loadYamlFile(join(__dirname, 'simple.yaml')),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  createServer(laminar(app)).listen(8080, () => {
    console.log('Server started');
  });
};

start();
```

## Simple Usage

Laminar can also be used without any spec for a very minimal and fast rest api

```typescript
import { get, laminar, router } from '@ovotech/laminar';
import { createServer } from 'http';

const findUser = (id: string) => ({ id, name: 'John' });

const app = laminar(
  router(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    get('/users/{id}', ({ path }) => findUser(path.id)),
  ),
));

createServer(app).listen(8080, () => console.log('Server started'));
```

## The Middleware

Laminar is built with the concept of nested middleware, that add / modify the context, and execute the next middleware. Each one can also read the response of the previous and modify it, "wrapping" the whole request / response execution.

Moreover, since a middleware is just a wrapper function, the types for the additional context properties will be passed down to the other resolvers.
In this example, 'logger' is actually typed properly all the way to the `get('/users/{id}', ({ path, logger })`.

```typescript
import { get, laminar, Middleware, routes } from '@ovotech/laminar';
import { createServer } from 'http';

const findUser = (id: string) => ({ id, name: 'John' });

interface Logger {
  logger: (message: string) => void;
}

const withLogging: Middleware<Logger> = resolver => {
  const logger = console.log;
  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const app = laminar(
  withLogging(
    routes(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      get('/users/{id}', ({ path, logger }) => {
        logger('More stuff');
        return findUser(path.id);
      }),
    ),
  ),
);

createServer(app).listen(8080, () => {
  console.log('Server started');
});
```

Resolvers in the middleware can be async as well, the default oapi middleware is like that, so middleware for them also have to be async if it wants to process the response in any way. otherwise it can just pass it along.

## Key concepts

### Why "Laminar" ?

Every request is processed as a series of function calls, each one wrapping the previous.

```typescript
const someMiddleware = next => {
  // ...do stuff before initialize
  return context => {
    // do stuff before next, using the context
    const result = next({ ...context, ...other });
    // do stuff after next, using the result
    return result;
  }
})
```

This way you can pipe the middlewares between each other, where each can modify the context of the next, by adding resources, throw exceptions, and process the results.

```typescript
const process = middleware1(middleware2(middleware3()));
```

What's neat about it is that since those are simply nested function calls, all typescript types are preserved, so that if one middleware adds something to the context, all the next would be aware of that at compile time.

I can picture this as an ordered flow of information through the pipes of the middlewares, thus the name.

### Processing Open API

The `oapi` middleware converts the OpenAPI validations to static json-schema for every path/method/response, and then just runs it against the context object. This way a lot of the computation is performed on initialization.

Both the request _and_ response are validated, this way if your code returns something that's not present in your open api schema, it would actually return an error. Your clients could therefore rely unconditionally that what you have specified in the schema is how your api will behave, without any possibility of drift in the future.
