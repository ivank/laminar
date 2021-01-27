# Cross-Origin Resource Sharing (CORS)

You can read about it in depth at [the MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

Here we'll talk mostly about how to implement it with a middleware. What are middleware is explained in depth in [its all about flows](./its-all-about-flows.md)

## Basic usage

> [examples/docs/src/cors.ts](https://github.com/ovotech/laminar/tree/main/examples/docs/src/cors.ts)

```typescript
import { httpServer, start, describe, jsonOk, openApi, corsMiddleware } from '@ovotech/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const app = await openApi({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });

  /**
   * Define cors with all of its options
   */
  const cors = corsMiddleware({ allowOrigin: ['http://localhost', 'http://example.com'] });

  /**
   * Apply cors
   */
  const server = httpServer({ app: cors(app), port: 3300 });
  await start(server);
  console.log(describe(server));
};

main();
```

## Customisations

You can also do customisations on the cors middleware

You can allow origins using a regex:

> [examples/docs/src/cors-regex.ts](https://github.com/ovotech/laminar/tree/main/examples/docs/src/cors-regex.ts)

```typescript
import { corsMiddleware } from '@ovotech/laminar';

/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
export const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });
```

You can allow origins using a function:

> [examples/docs/src/cors-function.ts](https://github.com/ovotech/laminar/tree/main/examples/docs/src/cors-function.ts)

```typescript
import { corsMiddleware } from '@ovotech/laminar';

/**
 * allowOrigin can be a function
 */
export const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });
```

You can allow other options:

> [examples/docs/src/cors-options.ts](https://github.com/ovotech/laminar/tree/main/examples/docs/src/cors-options.ts)

```typescript
import { corsMiddleware } from '@ovotech/laminar';

export const cors = corsMiddleware({
  /**
   * Allow origin can be a simple string
   */
  allowOrigin: 'http://localhost',
  /**
   * Allow credentials header
   */
  allowCredentials: true,
  /**
   * Allow methods header
   */
  allowMethods: ['POST', 'GET'],
  /**
   * Allow headers header
   */
  allowHeaders: ['Authorization', 'X-Authorization'],
});
```
