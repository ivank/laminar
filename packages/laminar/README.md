# Laminar

A minimal nodejs http server, built around the concept of strictly typed middlewares.

### Usage

```shell
yarn add @ovotech/laminar
```

To create an http server that responds to `GET .well-known/health-check`, `GET test` and `POST test`

> [examples/simple.ts](examples/simple.ts)

```typescript
import { get, post, laminar, start, router, describe, jsonOk, textOk } from '@ovotech/laminar';

const main = async () => {
  const server = laminar({
    port: 3333,
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await start(server);

  console.log(describe(server));
};

main();
```

### It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

> [examples/echo.ts](examples/echo.ts)

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

> [examples/echo-auth.ts](examples/echo-auth.ts)

```typescript
import { laminar, start, textForbidden, textOk, App, Middleware, describe } from '@ovotech/laminar';

const auth: Middleware = (next) => (req) => (req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me'));

const app: App = (req) => textOk(req.url.toString());

const server = laminar({ port: 3333, app: auth(app) });

start(server).then(() => console.log(describe(server)));
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [examples/echo-auth-log.ts](examples/echo-auth-log.ts)

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

You can see how we can string those middlewares along `log(auth(main))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [examples/echo-auth-log-db.ts](examples/echo-auth-log-db.ts)

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

### BodyParser

By default bodyParser has parsers for json, urlencoded and plain text. If nothing is matched, the `body` parameter object would be the actual readable stream http.IncomingMessage.

You can write and add your own parsers. Each one has a 'match' function and a 'parse' function. Parse also gets the raw http.IncomingMessage from node.

> [examples/body-parser.ts](examples/body-parser.ts)

```typescript
import { laminar, App, start, textOk, BodyParser, concatStream, defaultBodyParsers, describe } from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: App = ({ body }) => textOk(JSON.stringify(body));

const server = laminar({
  port: 3333,
  app,
  options: { bodyParsers: [csvParser, ...defaultBodyParsers] },
});

start(server).then(() => console.log(describe(server)));
```

### Router

The router middleware allows you to respond to requests based on what path was requested, as well as extract information from that path for use in processing your request.

> [examples/router.ts](examples/router.ts)

```typescript
import { get, put, laminar, router, start, jsonOk, jsonNotFound, describe } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    get('/users', () => jsonOk(users)),
    get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
    put('/users/{id}', ({ path, body }) => {
      users[path.id] = body;
      return jsonOk(users[path.id]);
    }),
    // Default URL handler
    ({ url }) => jsonNotFound({ message: `This url ${url} was not found` }),
  ),
});

start(server).then(() => console.log(describe(server)));
```

Path parameters are written in `{nameOfParameter}` style, and each name is extracted and its value passed in the `path` context property.

If none of the routes match, the router would return a generic 404. You can modify that by using `defaultRoute` at the end of all the matchers. You can also use `response` helper to set custom status code.

> [examples/default-route.ts](examples/default-route.ts)

```typescript
import { get, laminar, router, jsonOk, textNotFound, start, describe } from '@ovotech/laminar';

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    () => textNotFound('Woopsy'),
  ),
});

start(server).then(() => console.log(describe(server)));
```

You can also configure a route to ba a static folder with assets. Works with nested folders as well, does not support index pages.

> [examples/static-assets.ts](examples/static-assets.ts)

```typescript
import { get, laminar, router, directory, start, jsonOk, describe } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = laminar({
    port: 3333,
    app: router(
      directory('/my-folder', join(__dirname, 'assets')),
      get('/', () => jsonOk({ health: 'ok' })),
    ),
  });
  await start(server);
  console.log(describe(server));
};

main();
```

All the available route matchers are:

| Matcher   | Description                   |
| --------- | ----------------------------- |
| get       | Match path with http `GET`    |
| put       | Match path with http `PUT`    |
| post      | Match path with http `POST`   |
| del       | Match path with http `DELETE` |
| patch     | Match path with http `PATCH`  |
| option    | Match path with http `OPTION` |
| index     | Match any route or path       |
| directory | Resolve paths to static files |

### Response

Each laminar app must return a response object. Response objects are created with the various helpers. Example how it all looks like:

> [examples/cors.ts](examples/response.ts)

```typescript
import {
  get,
  laminar,
  router,
  start,
  jsonOk,
  jsonNotFound,
  redirect,
  jsonForbidden,
  file,
  jsonBadRequest,
  htmlBadRequest,
  htmlForbidden,
  htmlNotFound,
  htmlOk,
  json,
  csv,
  ok,
  badRequest,
  describe,
} from '@ovotech/laminar';
import { join } from 'path';

const server = laminar({
  port: 3333,
  app: router(
    // Redirects
    get('/redirect', () => redirect('http://my-new-location.example.com', { headers: { 'X-Other': 'Other' } })),

    // Static files
    get('/static-file', () => file(join(__dirname, 'assets/start.svg'))),

    // JSON Responses
    get('/json/forbidden', () => jsonForbidden({ message: 'Not Authorized' })),
    get('/json/object', () => jsonOk({ health: 'ok' })),
    get('/json/not-found-response', () => jsonNotFound({ message: 'not found' })),
    get('/json/bad-request', () => jsonBadRequest({ message: 'not found' })),

    // Custom status code
    get('/json/208', () => json({ body: { message: 'custom response' }, status: 208 })),

    // HTML Responses
    get('/json/forbidden', () => htmlForbidden('<html>Forbidden</html>')),
    get('/html/object', () => htmlOk('<html>OK</html>')),
    get('/html/not-found-response', () => htmlNotFound('<html>Not Found</html>')),
    get('/html/bad-request', () => htmlBadRequest('<html>Bad Request</html>')),

    // Additional Types
    get('/csv/ok', () => csv(ok({ body: 'one,two,three' }))),
    get('/csv/error', () => csv(badRequest({ body: 'error,error2,error3' }))),
  ),
});

start(server).then(() => console.log(describe(server)));
```

Helpers that set the status code are as follows:

| Helper              | Status Code |
| ------------------- | ----------- |
| ok                  | `200`       |
| movedPermanently    | `301`       |
| found               | `302`       |
| seeOther            | `303`       |
| notModified         | `304`       |
| badRequest          | `400`       |
| unauthorized        | `401`       |
| forbidden           | `403`       |
| notFound            | `404`       |
| internalServerError | `500`       |

Helpers that set the content type header are:

| Helper | Content Type Header                 |
| ------ | ----------------------------------- |
| json   | `application/json`                  |
| yaml   | `application/yaml`                  |
| binary | `application/octet-stream`          |
| form   | `application/x-www-form-urlencoded` |
| pdf    | `application/pdf`                   |
| xml    | `application/xml`                   |
| text   | `text/plain`                        |
| html   | `text/html`                         |
| css    | `text/css`                          |
| csv    | `text/csv`                          |

You can combine them any way you like:

```typescript
text(ok('My text'));
xml(badRequest('<request type="bad"></request>'));
internalServerError(yaml('message: error'));
```

Since they are used often, there are combined shelpers for text, json and html - `jsonOk`, `jsonBadRequest`, `textNotFound`, `htmlNotModified` ...

There are also 2 special helpers: redirect and file

redirect(location, options);

> Create a response object that will redirect to a given location.
> Sets the 'Location' header.

file(filename, options);

> Return a file response.
> Setting the 'content-type', 'content-length', 'last-modified' headers based on the file itself.
> Supports content ranges as well, if you pass the incommingMessage from the request, so it can determine the range.

### Cors Middleware

A cors handling middleware comes with laminar as well.

For example this would allow only 'example.com' and 'localhost' as origins.

> [examples/cors.ts](examples/cors.ts)

```typescript
import { start, jsonOk, get, put, laminar, router, corsMiddleware, describe } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const cors = corsMiddleware({
  allowOrigin: (origin) => ['http://example.com', 'http://localhost'].includes(origin),
});

const server = laminar({
  port: 3333,
  app: cors(
    router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users', () => jsonOk(users)),
      get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', ({ path, body }) => {
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
start(server).then(() => console.log(describe(server)));
```

### Logging Middleware

There's a simple middleware that allows you to log requests, responses and pass in a your own logger as a context.

> [examples/logging.ts](examples/logging.ts)

```typescript
import { get, put, laminar, start, router, jsonOk, loggingMiddleware, describe } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const logging = loggingMiddleware(console);

const server = laminar({
  port: 3333,
  app: logging(
    router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users', () => jsonOk(users)),
      get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', ({ path, body, logger }) => {
        logger.log('info', 'putting');
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
start(server).then(() => console.log(describe(server)));
```

### HTTPS (TLS) Support

laminar can use node's https server.

> [examples/simple-https.ts](examples/simple-https.ts)

```typescript
import { get, post, laminar, router, start, textOk, jsonOk, describe } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const server = laminar({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },

    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await start(server);

  console.log(describe(server));
};

main();
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
