# Http Service Router

Laminar can be used without an open api schema, being a light-weight alternative to tools like [express](expressjs.com), [koa](https://koajs.com), [hapi](https://hapi.dev) etc.

## Usage

You can use the `router` function to create a rest api

> [examples/docs/src/http-service-router/simple.ts:(simple)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/simple.ts#L3-L13)

```typescript
/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const listener: HttpListener = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  get('/users/{id}', async ({ path }) => jsonOk(findUser(path.id))),
);
```

## The router

The simplest possible http listener app you can write is just a function. Takes a request object, and returns response object.

A request object has at its core this `incomingMessage` which is an instance from node's own [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) though in practice you wouldn't need to interact with it much.

> [examples/docs/src/http-service-router/function.ts:(function)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/function.ts#L3-L10)

```typescript
/**
 * Returns the url path being accessed
 */
const listener: HttpListener = async ({ incomingMessage }) => jsonOk({ accessedUrl: incomingMessage.url });
```

While simple the app sits at the heart of all of laminar and is an essential building block, so don't dismiss it out of hand.

## Route helpers

Understanding that we can start using the router function:

> [examples/docs/src/http-service-router/complex.ts:(complex)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/complex.ts#L3-L50)

```typescript
const authors: Record<string, string> = { 10: 'Dave', 20: 'Bob' };
const articles: Record<string, string> = { 1: 'Hapiness', 2: 'Love' };

/**
 * Returns a laminar App object
 */
const listener = router(
  /**
   * You match pathnames with strings
   */
  get('/authors', async () => jsonOk(authors)),

  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters
   */
  get('/authors/{id}', async ({ path: { id } }) => jsonOk(authors[id])),

  /**
   * You can have multiple parameters in the path, all of them will be extracted
   */
  get('/blog/{articleId}/authors/{authorId}', async ({ path: { authorId, articleId } }) =>
    jsonOk([articles[articleId], authors[authorId]]),
  ),

  /**
   * You have helpers available for all the HTTP methods: get, post, del, patch, put, options
   */
  put('/authors', async ({ body }) => {
    authors[body.id] = body.name;
    return jsonOk({ success: true });
  }),

  /**
   * You can also use the low level function `route` for any custom method, or no method altogether (matching any method)
   */
  route({
    path: '/blog',
    method: 'DRAFT',
    listener: async ({ body }) => {
      articles[body.id] = body.name;
      return jsonOk({ success: true });
    },
  }),
);
```

If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters. You can have multiple parameters in the path, all of them will be extracted.

You have helpers available for all the HTTP methods: `get`, `post`, `del`, `patch`, `put`, `options`.

You can also use the low level function `route` for any custom method, or no method altogether (matching any method).

> [examples/docs/src/http-service-router/regex.ts:(app)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/regex.ts#L3-L32)

```typescript
const items: Record<string, string> = { 10: 'Dave', 20: 'Bob' };

/**
 * Returns a laminar App object
 */
const listener = router(
  /**
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes
   */
  get(/^\/names$/, async () => jsonOk(items)),

  /**
   * If a pathname has a capture group in it it would be captured and accessible with the `path` paramters array
   */
  get(/\/names\/(\d+)/, async ({ path: [id] }) => jsonOk(items[id])),

  /**
   * You can use other method helpers: get, post, del, patch, put, options are available
   */
  put(/^\/names$/, async ({ body }) => {
    items[body.id] = body.name;
    return jsonOk({ success: true });
  }),
);
```

You match pathnames with regex. They need to start it with a ^ and should end it with \$

Though that is not required and you can leave it out to create wildcard routes.

If a pathname has a capture group in it it would be captured and accessible with the `path` paramters array

## Static assets

You can serve a directory of static assesets with `staticAssets` helper.

> [examples/docs/src/http-service-router/static-assets.ts:(app)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/static-assets.ts#L4-L14)

```typescript
const listener = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * All the files from the 'assets' directory are going to be served
   */
  staticAssets('/my-assets', join(__dirname, '../../assets')),
);
```

All the files from the 'assets' directory are going to be served.

By default it accepts range headers on files and if you request a directory, it would load the index.html file. You can configure this with several configuration options.

> [examples/docs/src/http-service-router/static-assets-options.ts:(app)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-router/static-assets-options.ts#L4-L19)

```typescript
const listener = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * You can pass configuration options
   */
  staticAssets('/my-assets', join(__dirname, '../../assets'), {
    index: 'index.htm',
    acceptRanges: false,
    indexNotFound: async () => htmlNotFound('<html>Not Found</html>'),
    fileNotFound: async () => htmlNotFound('<html>No File</html>'),
  }),
);
```

- `indexNotFound` would be called if a directory was requested, but index file was not found (or was disabled with `index: undefined`).
- `fileNotFound` would be called if a file was not found at all.
- `acceptRanges` if it is set to false, no Accept-Ranges header would be sent and the Range request headers would not be used.
