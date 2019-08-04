# Laminar Open API

A Library for building OpenApi backed REST APIs. Automatic validation of request / response based on the api schema.
Generate TypeScript types using a cli.

**EXPERIMENTAL**

## Usage

```typescript
import { laminar } from '@ovotech/laminar';
import { withOapi, OapiConfig } from '@ovotech/laminar-oapi';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const config: OapiConfig = {
  api: 'simple.yaml',
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async (): Promise<void> => {
  const resolver = await withOapi(config);
  const server = await laminar({ app: resolver, port: 8081 });
  console.log('Started', server.address());
};

main();
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
import { laminar, HttpError } from '@ovotech/laminar';
import { withOapi, OapiConfig } from '@ovotech/laminar-oapi';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });
const validate = (authorizaitonHeader: string | undefined): void => {
  if (authorizaitonHeader !== 'Secret Pass') {
    throw new HttpError(403, { message: 'Unkown user' });
  }
};

const config: OapiConfig = {
  api: 'simple.yaml',
  security: {
    JWT: ({ headers }) => validate(headers.authorization),
  },
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async (): Promise<void> => {
  const resolver = await withOapi(config);
  const server = await laminar({ app: resolver, port: 8081 });
  console.log('Started', server.address());
};

main();
```

## Generating types

To generate a typescript types out of the OpenApi schema, you need to add the `@ovotech/laminar-oapi-cli` package, and then run the cli command:

```shell
yarn add --dev @ovotech/laminar-oapi-cli
yarn laminar-oapi simple.yaml __generated__/simple.ts
```

You also have the option of running a watcher that will auto-generate on file update.

```shell
yarn laminar-oapi simple.yaml __generated__/simple.ts --watch
```

If the schema has references to multiple files and those files are in the local file system, they will be watched for changes as well.

After that you can add the type with `oapi<Config>`, which will add types to both requests and responses.

```typescript
import { laminar } from '@ovotech/laminar';
import { withOapi } from '@ovotech/laminar-oapi';
import { Config } from './__generated__/simple';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const config: Config = {
  api: 'simple.yaml',
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async (): Promise<void> => {
  const resolver = await withOapi(config);
  const server = await laminar({ app: resolver, port: 8081 });
  console.log('Started', server.address());
};

main();
```

## Simple Usage

Laminar can also be used without any spec for a very minimal rest api

```typescript
import { get, laminar, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });
const resolver = router(
  get('/.well-known/health-check', () => ({ health: 'ok' })),
  get('/users/{id}', ({ path }) => findUser(path.id)),
);

const main = async (): Promise<void> => {
  const server = await laminar({ app: resolver, port: 8082 });
  console.log('Started', server.address());
};

main();
```

## The Middleware

Laminar is built with the concept of nested middlewares, that add / modify the context, and execute the next middleware. Each one can also read the response of the previous and modify it, "wrapping" the whole request / response execution.

Since a middleware is just a wrapper function, the types for the additional context properties will be passed down to the other resolvers.
In this example, 'logger' is defined by the `withLogging` middleware, but that type propagates all the way to the `get('/users/{id}', ({ path, logger })`.

```typescript
import { get, laminar, Context, Middleware, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

interface LoggerContext {
  logger: (message: string) => void;
}

const withLogging: Middleware<LoggerContext, Context> = resolver => {
  const logger = console.log;

  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const main = async (): Promise<void> => {
  const server = await laminar({
    app: withLogging(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        get('/users/{id}', ({ path, logger }) => {
          logger('More stuff');
          return findUser(path.id);
        }),
      ),
    ),
    port: 8082,
  });
  console.log('Started', server.address());
};

main();
```

Resolvers in the middleware can be async as well, the default oapi middleware is like that, so middleware for them also has to be async if it wants to process the response in any way. otherwise it can just pass it along.

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

What's neat about it is that since those are simply nested function calls, all typescript types are preserved, so that if one middleware adds something to the context, all the rest would be aware of that at compile time.

I can picture this as an ordered flow of information through the pipes of the middlewares, thus the name (Laminar).

### Processing Open API

The `oapi` middleware converts the OpenAPI validations to static json-schema for every path/method/response, and then just runs it against the context object. This way a lot of the computation is performed on initialization.

Both the request _and_ response are validated, this way if your code returns something that's not present in your open api schema, it would actually return an error. Your clients could therefore rely unconditionally that what you have specified in the schema is how your api will behave, without any possibility of drift in the future.
