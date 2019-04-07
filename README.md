# Laminar REST API Framework

A minimal rest api framework, for taking advantage of static types and OpenApi(Swagger) validation.

**EXPERIMENTAL**

## Usage

```typescript
import { laminar } from '@ovotech/laminar';
import { oapi } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const start = async () => {
  const app = await oapi({
    yamlFile: join(__dirname, 'simple.yaml'),
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

## Simple Usage

Laminar can also be used without any spec for a very minimal and fast rest api

```typescript
import { get, laminar, routes } from '@ovotech/laminar';
import { createServer } from 'http';

const findUser = (id: string) => ({ id, name: 'John' });

const app = laminar
  routes(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    get('/users/{id}', ({ path }) => findUser(path.id)),
  ),
);

createServer(app).listen(8080, () => {
  console.log('Server started');
});
```

## The Middleware

Laminar is built with the concept of nested middleware, that add / modify the context, and execute the next middleware. It can also read the response and modify it, "wrapping" the whole request / response execution.

Moreover, since its a simple function, the types for the additional context properties will be passed down to the other resolvers.
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

Resolvers in the middleware can be async as well, the default oapi middleware is like that, so middleware for them also has to be async if it wants to process the response in any way. otherwise it can just pass it along.

If we want to write the middlewares outside the laminar function call, we'll need to initialize their context with `Context`.

```typescript
import { Context, laminar, Middleware } from '@ovotech/laminar';
import { oapi } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

interface Logger {
  logger: (message: string) => void;
}

const withLogging: Middleware<Logger> = resolver => {
  const logger = console.log;
  return async ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = await resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const start = async () => {
  const app = withLogging<Context>(
    await oapi({
      yamlFile: join(__dirname, 'simple.yaml'),
      paths: {
        '/user/{id}': {
          get: ({ path, logger }) => {
            logger('Something else');
            return findUser(path.id);
          },
        },
      },
    }),
  );

  createServer(laminar(app)).listen(8080, () => {
    console.log('Server started');
  });
};

start();
```
