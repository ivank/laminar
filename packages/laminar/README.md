# Laminar

A minimal nodejs http server, built around the concept of strictly typed middlewares.

### Usage

```shell
yarn add @ovotech/laminar
```

To create an http server that responds to `GET .well-known/health-check`, `GET test` and `POST test`

```typescript
import { get, post, laminar, router } from '@ovotech/laminar';

const main = async () => {
  const server = await laminar({
    port: 3333,
    app: router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      post('/test', () => 'submited'),
      get('/test', () => 'index'),
    ),
  });

  console.log(server.address());
};

main();
```

### It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

```typescript
import { laminar, Resolver, Context } from '@ovotech/laminar';

const main: Resolver<Context> = ctx => ctx.body;
laminar({ port: 3333, app: main });
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

const main: Resolver<Context> = ctx => ctx.body;

laminar({ port: 3333, app: auth(main) });
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to stuff before and after whatever follows. For example say we wanted to log what the request and response was.

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

const main: Resolver<Context> = ctx => ctx.body;

laminar({ port: 3333, app: log(auth(main)) });
```

You can see how we can string those middlewares along `log(auth(main))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

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
const main: Resolver<DBContext & Context> = ctx => {
  return { echo: ctx.body, user: ctx.db.getValidUser() };
};

const db = createDbMiddleware();

laminar({ port: 3333, app: log(db(auth(main))) });
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it `laminar`.

### BodyParser

By default bodyParser has parsers for json, urlencoded and plain text. If nothing is matched, the `body` context object would be the actual readable stream IncomingObject.

You can write and add your own parsers. Each one has a 'match' function and a 'parse' function. Parse also gets the raw IncomingObject from node.

```typescript
import {
  laminar,
  Resolver,
  Context,
  createBodyParser,
  defaultParsers,
  BodyParser,
  concatStream,
} from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: contentType => contentType === 'text/csv',
  parse: async body => String(await concatStream(body)).split(','),
};

const bodyParser = createBodyParser([csvParser, ...defaultParsers]);

const main: Resolver<Context> = ctx => ctx.body;
laminar({ port: 3333, app: main, bodyParser });
```

### Router

The router middleware allows you to respond to requests based on what path was requested, as well as extract information from that path for use in processing your request.

```typescript
import { get, put, laminar, router } from '@ovotech/laminar';

const users: { [key: string]: string } = {
  '1': 'John',
  '2': 'Foo',
};

laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    get('/users', () => users),
    get('/users/{id}', ({ path }) => users[path.id]),
    put('/users/{id}', ({ path, body }) => {
      users[path.id] = body;
      return users[path.id];
    }),
  ),
});
```

Path parameters are written in `{nameOfParameter}` style, and each name is extracted and its value passed in the `path` context property.

If none of the routes match, the router would return a generic 404. You can modify that by using `defaultRoute` at the end of all the matchers. You can also use `response` helper to set custom status code.

```typescript
import { get, defaultRoute, laminar, router, response } from '@ovotech/laminar';

laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    defaultRoute(() => response({ status: 404, body: 'Woopsy' })),
  ),
});
```

All the available route matchers are:

| Matcher      | Description                   |
| ------------ | ----------------------------- |
| get          | Match path with http `GET`    |
| put          | Match path with http `PUT`    |
| post         | Match path with http `POST`   |
| del          | Match path with http `DELETE` |
| patch        | Match path with http `PATCH`  |
| option       | Match path with http `OPTION` |
| defaultRoute | Match any route or path       |

### Cors Middleware

A cors handling middleware comes with laminar as well.

For example this would allow only 'example.com' and 'localhost' as origins.

```typescript
import { get, put, laminar, router, createCors } from '@ovotech/laminar';

const users: { [key: string]: string } = {
  '1': 'John',
  '2': 'Foo',
};

const cors = createCors({
  allowOrigin: origin => ['example.com', 'localhost'].includes(origin),
});

laminar({
  port: 3333,
  app: cors(
    router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      get('/users', () => users),
      get('/users/{id}', ({ path }) => users[path.id]),
      put('/users/{id}', ({ path, body }) => {
        users[path.id] = body;
        return users[path.id];
      }),
    ),
  ),
});
```

### Logging Middleware

There's a simple middleware that allows you to log requests, responses and pass in a your own logger as a context.

```typescript
import { get, put, laminar, router, createLogging } from '@ovotech/laminar';

const users: { [key: string]: string } = {
  '1': 'John',
  '2': 'Foo',
};

const logging = createLogging(console);

laminar({
  port: 3333,
  app: logging(
    router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      get('/users', () => users),
      get('/users/{id}', ({ path }) => users[path.id]),
      put('/users/{id}', ({ path, body, logger }) => {
        logger.log('info', 'putting');
        users[path.id] = body;
        return users[path.id];
      }),
    ),
  ),
});
```

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
