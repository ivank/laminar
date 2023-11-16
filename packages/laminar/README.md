# Laminar

A minimal nodejs http server, built around the concept of strictly typed middlewares.

### Usage

```shell
yarn add @laminar/laminar
```

Docs for open api itself: https://swagger.io/docs/

> [examples/oapi.yaml](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/oapi.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
servers:
  - url: 'http: //localhost:3333'
paths:
  '/user':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              '$ref': '#/components/schemas/User'
      responses:
        '200':
          description: Newly Created User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/NewUser'
    get:
      responses:
        '200':
          description: Loaded User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/User'
components:
  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    NewUser:
      properties:
        result:
          type: string
        user:
          '$ref': '#/components/schemas/User'
      required:
        - result
        - user
```

> [examples/oapi.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/oapi.ts)

```typescript
import { HttpService, jsonOk, openApi, init } from '@laminar/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: async () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Configuration options

> [src/http/open-api/types.ts:(OapiConfig)](https://github.com/ivank/laminar/tree/main/packages/laminar/src/http/open-api/types.ts#L94-L125)

```typescript
/**
 * @category http
 */
export interface OapiConfig<TContext extends Empty = Empty, TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo> {
  /**
   * Can be a filename, that would be loaded and parsed (json or yaml). Or it can be the an object representing OpenAPI schema directly. Typescript types would be used to validate that object, as well as using the official json schema to validate it at runtime as well.
   */
  api: OpenAPIObject | string;
  /**
   * Aan object closely following the oapi `paths` config, with the "method" function being the actual resolver.
   * All the validations in open api would be run before executing it.
   * Validations on the response object shape would also be run, and would result in a 500 error if it doesn't match.
   * This would mean that any clients of this api can be 100% certain they would receive objects in the specified shape.
   */
  paths: OapiPaths<TContext>;
  /**
   * An object implementing the security requirements, specified in the open api config. More on this later.
   */
  security?: OapiSecurity<TContext, TOapiAuthInfo>;
  /**
   * Define how to render HttpError responses.
   * This is a normal http listener that takes the the contexts as well as an "error" property holding the current error
   */
  error?: HttpListener<TContext & { error: HttpError }>;
  /**
   * Format json-schema errors.
   * Refering to the `formatError` property in https://github.com/ivank/laminar/tree/main/packages/json-schema#custom-error-messages
   */
  formatErrors?: FormatErrors;
}
```

### Security

When you define OpenAPI security, you can configure a function that implements that security, and it will be automatically applied to all paths / methods that require it.

> [examples/oapi-security.yaml](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/oapi-security.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/user':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              '$ref': '#/components/schemas/User'
      security:
        - MySecurity:
            - admin
      responses:
        '200':
          description: Newly Created User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/NewUser'
    get:
      security:
        - MySecurity: []
      responses:
        '200':
          description: Loaded User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/User'
components:
  securitySchemes:
    MySecurity:
      type: http
      scheme: bearer
  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    NewUser:
      properties:
        result:
          type: string
        user:
          '$ref': '#/components/schemas/User'
      required:
        - result
        - user
```

> [examples/oapi-security.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/oapi-security.ts)

```typescript
import { HttpService, jsonOk, openApi, securityOk, init, securityError } from '@laminar/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi-security.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    security: {
      MySecurity: ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : securityError({ message: 'Unauthorized user' }),
    },
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: async () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

The security function would also receive the scopes defined in OpenAPI in the second argument, so you can make the authentication more specific

```typescript
const MySecurity = ({ headers }, { scopes }) => {
  // ...
};
```

### Generating types

You can use [@laminar/cli](../lamina-cli) package to generate types.

### Json Type Convertion

JSON and JS object are not _exactly_ the same, as you can [read to your horror at MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description). Laminar tries to follow that spec, converting your JS objects into stuff that your json-schema can validate. For example Date objects are converted to iso strings and undefined fields are omitted from the object.

This works on type level too. The types generated from the OpenApi schema would match JS objects passed to the helper functions `jsonOk`, `jsonNotFound` etc.

> [examples/convertion.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/convertion.ts)

```typescript
import { HttpService, jsonOk, openApi, init } from '@laminar/laminar';
import { join } from 'path';

const api = join(__dirname, 'convertion.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        /**
         * The Date object will be converted to a string
         * undefined values will be cleaned up
         */
        get: async () =>
          jsonOk({
            email: 'me@example.com',
            createdAt: new Date('2020-01-01T12:00:00Z'),
            title: undefined,
          }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Undocumented paths

You can define additional paths that are not defined by openapi schema. To do that you can use the `notFound` property, which accepts any laminar app.

> [examples/oapi-undocumented-routes.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/oapi-undocumented-routes.ts)

```typescript
import { HttpService, jsonOk, router, get, redirect, openApi, init } from '@laminar/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const listener = router(
    get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
    get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    await openApi({
      api,
      paths: {
        '/user': {
          post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
          get: async () => jsonOk({ email: 'me@example.com' }),
        },
      },
    }),
  );

  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Usage without Open API

To create an http server that responds to `GET .well-known/health-check`, `GET test` and `POST test`

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/simple.ts)

```typescript
import { get, post, HttpService, router, jsonOk, textOk, init } from '@laminar/laminar';

const main = async () => {
  const http = new HttpService({
    listener: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init({ initOrder: [http], logger: console });
};

main();
```

### It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

> [examples/echo.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo.ts)

```typescript
import { HttpService, response, init } from '@laminar/laminar';

const http = new HttpService({ listener: async ({ body }) => response({ body }) });

init({ initOrder: [http], logger: console });
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

> [examples/echo-auth.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth.ts)

```typescript
import { HttpService, textForbidden, textOk, HttpListener, HttpMiddleware, init } from '@laminar/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpListener = async (req) => textOk(req.url.toString());

const http = new HttpService({ listener: auth(app) });

init({ initOrder: [http], logger: console });
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [examples/echo-auth-log.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth-log.ts)

```typescript
import { HttpMiddleware, HttpListener, textForbidden, textOk, HttpService, init } from '@laminar/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpListener = async (req) => textOk(req.body);

const http = new HttpService({ listener: log(auth(app)) });

init({ initOrder: [http], logger: console });
```

You can see how we can string those middlewares along `log(auth(main))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [examples/echo-auth-log-db.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/echo-auth-log-db.ts)

```typescript
import { HttpMiddleware, HttpListener, textForbidden, jsonOk, HttpService, init } from '@laminar/laminar';

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
const createDbMiddleware = (): HttpMiddleware<DBContext> => {
  const db: DB = { getValidUser: () => 'Me' };
  return (next) => (req) => next({ ...req, db });
};

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

/**
 * We can now require this app to have the middleware.
 * If the propper ones are not executed later, TypeScript will inform us at compile time.
 */
const app: HttpListener<DBContext> = async (req) => jsonOk({ url: req.url.toString(), user: req.db.getValidUser() });

const db = createDbMiddleware();

const http = new HttpService({ listener: log(db(auth(app))) });

init({ initOrder: [http], logger: console });
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it `laminar`.

### BodyParser

By default bodyParser has parsers for json, urlencoded and plain text. If nothing is matched, the `body` parameter object would be the actual readable stream http.IncomingMessage.

You can write and add your own parsers. Each one has a 'match' function and a 'parse' function. Parse also gets the raw http.IncomingMessage from node.

> [examples/body-parser.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/body-parser.ts)

```typescript
import {
  HttpService,
  HttpListener,
  textOk,
  BodyParser,
  concatStream,
  defaultBodyParsers,
  init,
} from '@laminar/laminar';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => String(await concatStream(body)).split(','),
};

const listener: HttpListener = async ({ body }) => textOk(JSON.stringify(body));

const http = new HttpService({
  listener,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ initOrder: [http], logger: console });
```

### Streaming Data

By default the body parser will concat the incoming request body stream into a string object and pass that around into your app. Sometimes you'd want to not do that for certain content types, like csv data for example.

You can achieve that by writing your own parser that will preserve the `Readable` body object and just pass it inside.

> [examples/streaming-parser.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/streaming-parser.ts)

```typescript
import { HttpService, HttpListener, BodyParser, defaultBodyParsers, csv, ok, init } from '@laminar/laminar';
import { pipeline, Readable, Transform } from 'stream';
import parse from 'csv-parse';
import stringify from 'csv-stringify';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => body,
};

const upperCaseTransform = new Transform({
  objectMode: true,
  transform: (row: string[], encoding, callback) =>
    callback(
      undefined,
      row.map((item) => item.toUpperCase()),
    ),
});

/**
 * A function that will convert a readable stream of a csv into one with all items upper cased.
 * Using node's [pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback) function to handle the streams
 */
const transformCsv = (body: Readable): Readable =>
  pipeline(body, parse(), upperCaseTransform, stringify(), (err) => (err ? console.error(err.message) : undefined));

const listener: HttpListener = async ({ body }) => csv(ok({ body: transformCsv(body) }));

const http = new HttpService({
  listener,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ initOrder: [http], logger: console });
```

Alternatively, you can also set `bodyParsers` option to an empty array (`[]`), and use `bodyParserComponent` as a middleware, selectively only on specific routes.

### Router

The router middleware allows you to respond to requests based on what path was requested, as well as extract information from that path for use in processing your request.

> [examples/router.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/router.ts)

```typescript
import { get, put, HttpService, router, jsonOk, jsonNotFound, init } from '@laminar/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    get('/users', async () => jsonOk(users)),
    get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
    put('/users/{id}', async ({ path, body }) => {
      users[path.id] = body;
      return jsonOk(users[path.id]);
    }),
    // Default URL handler
    async ({ url }) => jsonNotFound({ message: `This url ${url} was not found` }),
  ),
});

init({ initOrder: [http], logger: console });
```

Path parameters are written in `{nameOfParameter}` style, and each name is extracted and its value passed in the `path` context property.

If none of the routes match, the router would return a generic 404. You can modify that by using `defaultRoute` at the end of all the matchers. You can also use `response` helper to set custom status code.

> [examples/default-route.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/default-route.ts)

```typescript
import { get, router, init, jsonOk, textNotFound, HttpService } from '@laminar/laminar';

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    async () => textNotFound('Woopsy'),
  ),
});

init({ initOrder: [http], logger: console });
```

You can also configure a route to ba a static folder with assets. Works with nested folders as well, does not support index pages.

> [examples/static-assets.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/static-assets.ts)

```typescript
import { get, HttpService, router, staticAssets, jsonOk, init } from '@laminar/laminar';
import { join } from 'path';

const main = async () => {
  const http = new HttpService({
    listener: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', async () => jsonOk({ health: 'ok' })),
    ),
  });
  await init({ initOrder: [http], logger: console });
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

> [examples/cors.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/response.ts)

```typescript
import {
  get,
  HttpService,
  router,
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
  textOk,
  init,
} from '@laminar/laminar';
import { createReadStream } from 'fs';
import { join } from 'path';

const http = new HttpService({
  listener: router(
    // Redirects
    get('/redirect', async () => redirect('http://my-new-location.example.com', { headers: { 'X-Other': 'Other' } })),

    // Static files
    get('/static-file', async () => file(join(__dirname, 'assets/start.svg'))),

    // Different stream types
    get('/text-stream', async () => textOk(createReadStream(join(__dirname, 'assets/texts/one.txt')))),
    get('/html-stream', async () => htmlOk(createReadStream(join(__dirname, 'assets/texts/other.html')))),

    // JSON Responses
    get('/json/forbidden', async () => jsonForbidden({ message: 'Not Authorized' })),
    get('/json/object', async () => jsonOk({ health: 'ok' })),
    get('/json/not-found-response', async () => jsonNotFound({ message: 'not found' })),
    get('/json/bad-request', async () => jsonBadRequest({ message: 'not found' })),

    // Custom status code
    get('/json/208', async () => json({ body: { message: 'custom response' }, status: 208 })),

    // HTML Responses
    get('/json/forbidden', async () => htmlForbidden('<html>Forbidden</html>')),
    get('/html/object', async () => htmlOk('<html>OK</html>')),
    get('/html/not-found-response', async () => htmlNotFound('<html>Not Found</html>')),
    get('/html/bad-request', async () => htmlBadRequest('<html>Bad Request</html>')),

    // Additional Types
    get('/csv/ok', async () => csv(ok({ body: 'one,two,three' }))),
    get('/csv/error', async () => csv(badRequest({ body: 'error,error2,error3' }))),
  ),
});

init({ initOrder: [http], logger: console });
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

> [examples/cors.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/cors.ts)

```typescript
import { jsonOk, get, put, HttpService, router, corsMiddleware, init } from '@laminar/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const cors = corsMiddleware({
  allowOrigin: (origin) => ['http://example.com', 'http://localhost'].includes(origin),
});

const http = new HttpService({
  listener: cors(
    router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users', async () => jsonOk(users)),
      get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', async ({ path, body }) => {
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
init({ initOrder: [http], logger: console });
```

### Multipart Form Data

Laminar has a built in parser form request with content-type 'multipart/form-data'. This allows it to process html forms with native uploads.

> [examples/multipart.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/multipart.ts)

```typescript
import { HttpService, jsonOk, init } from '@laminar/laminar';

const http = new HttpService({
  listener: async ({ body }) => jsonOk({ name: body.name, file: body['my-file'][0].data.toString() }),
});

init({ initOrder: [http], logger: console });
```

```sh
curl -X POST 'localhost:3300' --form 'name=example' --form 'my-file=@examples/assets/star.svg'
```

With that curl command you should see a response like:

```
{"name":"example","file":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n<path d=\"M50,3l12,36h38l-30,22l11,36l-31-21l-31,21l11-36l-30-22h38z\" fill=\"#FF0\" stroke=\"#FC0\" stroke-width=\"2\"/>\n</svg>\n"}
```

### Logging Middleware

There's a simple middleware that allows you to log requests, responses and pass in a your own logger as a context.

> [examples/logging.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/logging.ts)

```typescript
import { get, put, HttpService, router, jsonOk, requestLoggingMiddleware, init } from '@laminar/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const logging = requestLoggingMiddleware(console);

const http = new HttpService({
  listener: logging(
    router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users', async () => jsonOk(users)),
      get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', async ({ path, body, logger }) => {
        logger.info('putting');
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});

init({ initOrder: [http], logger: console });
```

### HTTPS (TLS) Support

laminar can use node's https server.

> [examples/simple-https.ts](https://github.com/ivank/laminar/tree/main/packages/laminar/examples/simple-https.ts)

```typescript
import { get, post, HttpService, router, textOk, jsonOk, init } from '@laminar/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const http = new HttpService({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },
    listener: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init({ initOrder: [http], logger: console });
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

Deployment is preferment by yarn automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
