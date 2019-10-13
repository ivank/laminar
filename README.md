# Laminar Open API

A Library for building OpenApi backed REST APIs. Automatic validation of request / response based on the api schema.
Generate TypeScript types using a cli.

## Usage

You first define your OpenAPI file:

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

And then you can implement it using [@ovotech/laminar-oapi](packages/laminar-oapi)

```typescript
import { laminar } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const main = async (): Promise<void> => {
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });
  const server = await laminar({ app, port: 8081 });
  console.log('Started', server.address());
};

main();
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
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

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

const main = async (): Promise<void> => {
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    security: {
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });
  const server = await laminar({ app, port: 8081 });
  console.log('Started', server.address());
};

main();
```

## Generating types

To generate a typescript types out of the OpenApi schema, you need to add the [@ovotech/laminar-oapi-cli](packages/laminar-oapi-cli) package, and then run the cli command:

```shell
yarn add --dev @ovotech/laminar-oapi-cli
yarn laminar-oapi simple.yaml __generated__/simple.ts
```

You also have the option of running a watcher that will auto-generate on file update.

```shell
yarn laminar-oapi simple.yaml __generated__/simple.ts --watch
```

If the schema has references to multiple files and those files are in the local file system, they will be watched for changes as well.

```typescript
import { laminar } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { Config, UserResponse } from './__generated__/simple';
import { join } from 'path';

const findUser = (id: string): UserResponse => ({ id, name: 'John' });

const config: Config = {
  api: join(__dirname, 'simple.yaml'),
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async (): Promise<void> => {
  const app = await createOapi(config);
  const server = await laminar({ app, port: 8081 });
  console.log('Started', server.address());
};

main();
```

## Simple Usage

Laminar can also be used without any spec for a very minimal rest api.

```typescript
import { get, laminar, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const app = router(
  get('/.well-known/health-check', () => ({ health: 'ok' })),
  get('/users/{id}', ({ path }) => findUser(path.id)),
);

const main = async (): Promise<void> => {
  const server = await laminar({ app, port: 8082 });
  console.log('Started', server.address());
};

main();
```

## It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

```typescript
import { laminar, Resolver, Context } from '@ovotech/laminar';

const app: Resolver<Context> = ctx => ctx.body;
laminar({ port: 3333, app });
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

```typescript
import { laminar, Context, message, Resolver } from '@ovotech/laminar';

const auth = (next: Resolver<Context>): Resolver<Context> => ctx => {
  if (ctx.headers.authorization !== 'Me') {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const app: Resolver<Context> = ctx => ctx.body;

laminar({ port: 3333, app: auth(app) });
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

```typescript
import { laminar, Context, message, Resolver } from '@ovotech/laminar';

const auth = (next: Resolver<Context>): Resolver<Context> => ctx => {
  if (ctx.headers.authorization !== 'Me') {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const log = (next: Resolver<Context>): Resolver<Context> => ctx => {
  console.log('Requested', ctx.body);
  const response = next(ctx);
  console.log('Responded', response);
  return response;
};

const app: Resolver<Context> = ctx => ctx.body;

laminar({ port: 3333, app: log(auth(app)) });
```

You can see how we can string those middlewares along `log(auth(app))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

```typescript
import { laminar, Context, message, Resolver, Middleware } from '@ovotech/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface DBContext {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 *
 * We use the handy Middleware type that has a signature of Middleware<ProvideContext, RequireContext>
 */
const createDbMiddleware = (): Middleware<DBContext, Context> => {
  const db: DB = {
    getValidUser: () => 'Me',
  };

  return next => ctx => next({ ...ctx, db });
};

const auth: Middleware<{}, DBContext & Context> = next => ctx => {
  if (ctx.db.getValidUser() !== ctx.headers.authorization) {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const log: Middleware<{}, Context> = next => ctx => {
  console.log('Requested', ctx.body);
  const response = next(ctx);
  console.log('Responded', response);
  return response;
};

/**
 * We can also get use of the same databse connection in any middleware downstream
 */
const app: Resolver<DBContext & Context> = ctx => {
  return { echo: ctx.body, user: ctx.db.getValidUser() };
};

const db = createDbMiddleware();

laminar({ port: 3333, app: log(db(auth(app))) });
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it `laminar`.

### Built In Middlewares

- [cors](packages/laminar/README.md#cors-middleware) for managing cross origin resources
- [logging](packages/laminar/README.md#logging-middleware) for setting custom loggers, e.g. winstonjs and logging stuff before / after any request
- [laminar-handlebars](packages/laminar-handlebars/README.md) support for handlebars view templates
- [laminar-jwt](packages/laminar-jwt/README.md) support for json web tokens

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by lerna automatically on merge / push to master, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
