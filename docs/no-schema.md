# No OpenAPI Schema Usage

Laminar can be used without an open api schema, being a light-weight alternative to tools like [express](expressjs.com), [koa](https://koajs.com), [hapi](https://hapi.dev) etc.

## Usage

You can use the `router` function to create a rest api

> [examples/docs/src/server.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/server.ts)

```typescript
import { get, jsonOk, router, httpServer, describe, start } from '@ovotech/laminar';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const server = httpServer({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users/{id}', ({ path }) => jsonOk(findUser(path.id))),
    ),
    port: 3300,
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   */
  await start(server);

  console.log(describe(server));
};

main();
```

## The router

The simplest possible laminar app you can write is just a function. Takes a request object, and returns response object.

A request object has at its core this `incommingMessage` which is an instance from node's own [http.IncommingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) though in practice you wouldn't need to interact with it much.

> [examples/docs/src/app.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/app.ts)

```typescript
import { App, jsonOk } from '@ovotech/laminar';

/**
 * Returns the url path being accessed
 */
export const app: App = ({ incommingMessage }) => {
  return jsonOk({ accessedUrl: incommingMessage.url });
};
```

While simple the app sits at the heart of all of laminar and is an essential building block, so don't dismiss it out of hand.

## Route helpers

Understanding that we can start using the router function:

> [examples/docs/src/router.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/router.ts)

```typescript
import { router, jsonOk, get, put, route } from '@ovotech/laminar';

const authors: Record<string, string> = { 10: 'Dave', 20: 'Bob' };
const articles: Record<string, string> = { 1: 'Hapiness', 2: 'Love' };

/**
 * Returns a laminar App object
 */
export const app = router(
  /**
   * You match pathnames with strings
   */
  get('/authors', () => jsonOk(authors)),

  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters
   */
  get('/authors/{id}', ({ path: { id } }) => jsonOk(authors[id])),

  /**
   * You can have multiple parameters in the path, all of them will be extracted
   */
  get('/blog/{articleId}/authors/{authorId}', ({ path: { authorId, articleId } }) =>
    jsonOk([articles[articleId], authors[authorId]]),
  ),

  /**
   * You have helpers available for all the HTTP methods: get, post, del, patch, put, options
   */
  put('/authors', ({ body }) => {
    authors[body.id] = body.name;
    return jsonOk({ success: true });
  }),

  /**
   * You can also use the low level function `route` for any custom method, or no method altogether (matching any method)
   */
  route({
    path: '/blog',
    method: 'DRAFT',
    app: ({ body }) => {
      articles[body.id] = body.name;
      return jsonOk({ success: true });
    },
  }),
);
```

If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters. You can have multiple parameters in the path, all of them will be extracted.

You have helpers available for all the HTTP methods: `get`, `post`, `del`, `patch`, `put`, `options`.

You can also use the low level function `route` for any custom method, or no method altogether (matching any method).

> [examples/docs/src/router-regex.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/router-regex.ts)

```typescript
import { router, jsonOk, get, put } from '@ovotech/laminar';

const items: Record<string, string> = { 10: 'Dave', 20: 'Bob' };

/**
 * Returns a laminar App object
 */
export const app = router(
  /**
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes
   */
  get(/^\/names$/, () => jsonOk(items)),

  /**
   * If a pathname has a capture group in it it would be captured and accessible with the `path` paramters array
   */
  get(/\/names\/(\d+)/, ({ path: [id] }) => jsonOk(items[id])),

  /**
   * You can use other method helpers: get, post, del, patch, put, options are available
   */
  put(/^\/names$/, ({ body }) => {
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

> [examples/docs/src/static-assets.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/static-assets.ts)

```typescript
import { router, jsonOk, get, staticAssets } from '@ovotech/laminar';
import { join } from 'path';

export const app = router(
  get('/.well-known/health-check', () => jsonOk({ success: 'ok' })),
  /**
   * All the files from the 'assets' directory are going to be served
   */
  staticAssets('/my-assets', join(__dirname, 'assets')),
);
```

All the files from the 'assets' directory are going to be served.

By default it accepts range headers on files and if you request a directory, it would load the index.html file. You can configure this with several configuration options.

> [examples/docs/src/static-assets-options.ts](https://github.com/ovotech/laminar/tree/master/examples/docs/src/static-assets-options.ts)

```typescript
import { router, jsonOk, get, staticAssets, htmlNotFound } from '@ovotech/laminar';
import { join } from 'path';

export const app = router(
  get('/.well-known/health-check', () => jsonOk({ success: 'ok' })),
  /**
   * You can pass configuration options
   */
  staticAssets('/my-assets', join(__dirname, 'assets'), {
    index: 'index.htm',
    acceptRanges: false,
    indexNotFound: () => htmlNotFound('<html>Not Found</html>'),
    fileNotFound: () => htmlNotFound('<html>No File</html>'),
  }),
);
```

- `indexNotFound` would be called if a directory was requested, but index file was not found (or was disabled with `index: undefined`).
- `fileNotFound` would be called if a file was not found at all.
- `acceptRanges` if it is set to false, no Accept-Ranges header would be sent and the Range request headers would not be used.
