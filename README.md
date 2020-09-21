# Laminar Open API

A Library for building OpenApi backed REST APIs. Automatic validation of request / response based on the api schema.
Generate TypeScript types using a cli. This is an attempt to implement the concepts of [API Design First](https://apisyouwonthate.com/blog/api-design-first-vs-code-first) principles cleanly.

Packages:

- [@ovotech/laminar](packages/laminar) - core http server
- [@ovotech/laminar-oapi](packages/laminar-oapi) - [OpenAPI](https://swagger.io/docs/) middleware
- [@ovotech/laminar-oapi-cli](packages/laminar-oapi-cli) - [OpenAPI](https://swagger.io/docs/) type generation
- [@ovotech/laminar-handlebars](packages/laminar-handlebars) - [handlebars](https://github.com/wycats/handlebars.js/) middleware
- [@ovotech/laminar-jwt](packages/laminar-handlebars) - [JSON Web Token](https://github.com/auth0/node-jsonwebtoken) middleware
- [@ovotech/json-schema](packages/json-schema) - Lightweight json-schema validator

## Usage

You first define your OpenAPI file:

> [examples/simple/simple.yaml](examples/simple/simple.yaml)

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

> [examples/simple/simple.ts](examples/simple/simple.ts)

```typescript
import { laminar, start, describe, jsonOk, loggingMiddleware } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const logging = loggingMiddleware(console);
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });

  const server = laminar({ app: logging(app), port: 3300 });
  await start(server);

  console.log(describe(server));
};

main();
```

This would validate both the request and the response, making sure your code receives only valid requests and that your clients will only get the responses specified in the schema.

## Security

If you have this schema:

> [examples/security/security.yaml](examples/security/security.yaml)

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

> [examples/security/security.ts](examples/security/security.ts)

```typescript
import {
  laminar,
  start,
  jsonOk,
  describe,
  loggingMiddleware,
  jsonForbidden,
} from '@ovotech/laminar';
import { createOapi, securityOk } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });
const validate = (authorizaitonHeader?: string) =>
  authorizaitonHeader === 'Secret Pass'
    ? securityOk({ email: 'me@example.com' })
    : jsonForbidden({ message: 'Unkown user' });

const main = async () => {
  const logging = loggingMiddleware(console);
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    security: {
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
  const server = laminar({ app: logging(app), port: 3300 });
  await start(server);
  console.log(describe(server));
};

main();
```

## Generating types

To generate a typescript types out of the OpenApi schema, you need to add the [@ovotech/laminar-oapi-cli](packages/laminar-oapi-cli) package, and then run the cli command:

```shell
yarn add --dev @ovotech/laminar-oapi-cli
yarn laminar-oapi examples/simple.yaml examples/__generated__/simple.ts
```

You also have the option of running a watcher that will auto-generate on file update.

```shell
yarn laminar-oapi simple.yaml __generated__/simple.ts --watch
```

If the schema has references to multiple files and those files are in the local file system, they will be watched for changes as well.

> [examples/simple-types/simple-types.ts](examples/simple-types/simple-types.ts)

```typescript
import { RequestOapi, OapiConfig, ResponseOapi } from "@ovotech/laminar-oapi";

import { Empty } from "@ovotech/laminar";

export interface Config<R extends Empty = Empty> extends OapiConfig<R> {
    paths: {
        "/user/{id}": {
            get: PathUserIdGet<R>;
        };
    };
}

export interface UserResponse {
    id?: string;
    name?: string;
    [key: string]: unknown;
}

export type ResponseUserIdGet = ResponseOapi<UserResponse, 200, "application/json">;

export interface RequestUserIdGet extends RequestOapi {
    path: {
        id: string;
    };
}

export type PathUserIdGet<R extends Empty = Empty> = (req: RequestUserIdGet & R) => ResponseUserIdGet | Promise<ResponseUserIdGet>;
```

## Simple Usage

Laminar can also be used without any spec for a very minimal rest api.

> [examples/routes/routes.ts](examples/routes/routes.ts)

```typescript
import { get, jsonOk, router, laminar, describe } from '@ovotech/laminar';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const server = laminar({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users/{id}', ({ path }) => jsonOk(findUser(path.id))),
    ),
    port: 8082,
  });

  console.log(describe(server));
};

main();
```

## An in-depth example

You can explore an example of a running laminar petstore app in the examples directory: [examples/apps/petstore](examples/apps/petstore)

## It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

> [packages/laminar/examples/echo.ts](packages/laminar/examples/echo.ts)

```typescript
import { laminar, start, response, describe } from '@ovotech/laminar';

const server = laminar({ port: 3333, app: ({ body }) => response({ body }) });

start(server).then(() => console.log(describe(server)));
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

> [packages/laminar/examples/echo-auth.ts](packages/laminar/examples/echo-auth.ts)

```typescript
import { laminar, start, textForbidden, textOk, App, Middleware, describe } from '@ovotech/laminar';

const auth: Middleware = (next) => (req) => (req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me'));

const app: App = (req) => textOk(req.url.toString());

const server = laminar({ port: 3333, app: auth(app) });

start(server).then(() => console.log(describe(server)));
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [packages/laminar/examples/echo-auth-log.ts](packages/laminar/examples/echo-auth-log.ts)

```typescript
import { Middleware, App, textForbidden, textOk, start, laminar, describe } from '@ovotech/laminar';

const auth: Middleware = (next) => (req) => (req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me'));

const log: Middleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: App = (req) => textOk(req.body);

const server = laminar({ port: 3333, app: log(auth(app)) });
start(server).then(() => console.log(describe(server)));
```

You can see how we can string those middlewares along `log(auth(app))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [packages/laminar/examples/echo-auth-log-db.ts](packages/laminar/examples/echo-auth-log-db.ts)

```typescript
import { Middleware, App, textForbidden, jsonOk, start, laminar, describe } from '@ovotech/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface RequestDB {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 */
const createDbMiddleware = (): Middleware<RequestDB> => {
  const db: DB = { getValidUser: () => 'Me' };
  return (next) => (req) => next({ ...req, db });
};

const auth: Middleware = (next) => (req) => (req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me'));

const log: Middleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

/**
 * We can now require this app to have the middleware.
 * If the propper ones are not executed later, TypeScript will inform us at compile time.
 */
const app: App<RequestDB> = (req) => jsonOk({ url: req.url, user: req.db.getValidUser() });

const db = createDbMiddleware();

const server = laminar({ port: 3333, app: log(db(auth(app))) });
start(server).then(() => console.log(describe(server)));
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it `laminar`.

That `log(db(auth(app)))` bit is your whole application and it is just converting the request context (body, headers, path, etc) to the appropriate response, it is in effect nothing more than:

```typescript
const resolver = log(db(auth(app)));

server.on(async (request, response) => {
  const result = await resolver(request);
  response.send(result);
});
```

### Built In Middlewares

- [cors](packages/laminar/README.md#cors-middleware) for managing cross origin resources
- [logging](packages/laminar/README.md#logging-middleware) for setting custom loggers, e.g. winstonjs and logging stuff before / after any request
- [laminar-handlebars](packages/laminar-handlebars/README.md) support for handlebars view templates
- [laminar-jwt](packages/laminar-jwt/README.md) support for json web tokens

### Splitting your app

You can split all your middlewares, path handlers, and other parts of the app in different files / modules. If they implement the right interfaces you can be sure about all of your dependencies at compile time.

You can inspect the whole app in [examples/split](examples/split)

> [examples/split/src/db.middleware.ts](examples/split/src/db.middleware.ts)

```typescript
import { Middleware } from '@ovotech/laminar';
import { Client } from 'pg';

export interface RequestPg {
  pg: Client;
}

/**
 * Creat a pg connection and pass to each request (simple but not production ready)
 */
export const createPgClient = async (config: string): Promise<Middleware<RequestPg>> => {
  const pg = new Client(config);
  await pg.connect();
  return (next) => (ctx) => next({ ...ctx, pg });
};
```

> [examples/split/src/health-check.route.ts](examples/split/src/health-check.route.ts)

```typescript
import { AppRoute, jsonOk } from '@ovotech/laminar';

export const healthCheck: AppRoute = () => jsonOk({ health: 'ok' });
```

> [examples/split/src/find.route.ts](examples/split/src/find.route.ts)

```typescript
import { AppRoute, jsonOk, jsonNotFound } from '@ovotech/laminar';
import { RequestPg } from './db.middleware';

/**
 * Finding a user requires a PG connection
 */
export type FindRoute = AppRoute<RequestPg>;

export const find: FindRoute = async ({ path, pg }) => {
  const { rows } = await pg.query('SELECT id, name FROM users WHERE id = $1', [path.id]);

  return rows[0]
    ? jsonOk(rows[0])
    : jsonNotFound({ message: `No User With id ${path.id} was found` });
};
```

> [examples/split/src/update.route.ts](examples/split/src/update.route.ts)

```typescript
import { AppRoute, RequestLogging, jsonOk } from '@ovotech/laminar';
import { RequestPg } from './db.middleware';

/**
 * Updating a user requires a PG connection and logging capablilities
 */
export type UpdateRoute = AppRoute<RequestPg & RequestLogging<Console>>;

export const update: UpdateRoute = async ({ path, pg, body, logger }) => {
  await pg.query('UPDATE users SET name = $1 WHERE id = $2', [body.name, path.id]);
  logger.log('info', 'User Updated');

  return jsonOk({ message: 'User Updated' });
};
```

> [examples/split/src/routes.ts](examples/split/src/routes.ts)

```typescript
import { router, get, put } from '@ovotech/laminar';
import { find } from './find.route';
import { healthCheck } from './health-check.route';
import { update } from './update.route';

export const routes = router(
  get('/.well-known/health-check', healthCheck),
  get('/users/{id}', find),
  put('/users/{id}', update),
);
```

> [examples/split/src/index.ts](examples/split/src/index.ts)

```typescript
import { loggingMiddleware, laminar, start, describe } from '@ovotech/laminar';
import { createPgClient } from './db.middleware';
import { routes } from './routes';

const main = async () => {
  if (process.env.PG === undefined) {
    throw new Error('Need PG env variable');
  }

  if (process.env.PORT === undefined) {
    throw new Error('Need PORT env variable');
  }

  const logging = loggingMiddleware(console);
  const pgClient = await createPgClient(process.env.PG);

  const app = logging(pgClient(routes));

  const server = laminar({ app, port: Number(process.env.PORT) });
  await start(server);

  console.log(describe(server));
};

main();
```

## Running the tests

You'll need to start a postgres instance to run the tests for some of the exmaples

```shell
docker-compose -f examples/docker-compose.yaml
```

You can then run the tests with:

```shell
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is done by lerna automatically on merge / push to master, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
