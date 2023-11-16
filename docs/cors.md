# Cross-Origin Resource Sharing (CORS)

You can read about it in depth at [the MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

Here we'll talk mostly about how to implement it with a middleware. What are middleware is explained in depth in [its all about flows](./its-all-about-flows.md)

## Basic usage

> [examples/docs/src/cors/simple.ts](https://github.com/ivank/laminar/tree/main/examples/docs/src/cors/simple.ts)

```typescript
import { HttpService, init, jsonOk, openApi, corsMiddleware } from '@laminarjs/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

/**
 * Define cors with all of its options
 */
const cors = corsMiddleware({ allowOrigin: ['http://localhost', 'http://example.com'] });

const main = async () => {
  const app = await openApi({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': { get: async ({ path }) => jsonOk(findUser(path.id)) },
    },
  });

  /**
   * Apply cors
   */
  const http = new HttpService({ listener: cors(app) });
  await init({ initOrder: [http], logger: console });
};

main();
```

## Customisations

You can also do customisations on the cors middleware

You can allow origins using a regex:

> [examples/docs/src/cors/regex.ts:(middleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/cors/regex.ts#L5-L12)

```typescript
/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });
```

You can allow origins using a function:

> [examples/docs/src/cors/function.ts:(middleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/cors/function.ts#L5-L12)

```typescript
/**
 * allowOrigin can be a function
 */
const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });
```

You can allow other options:

> [examples/docs/src/cors/options.ts:(middleware)](https://github.com/ivank/laminar/tree/main/examples/docs/src/cors/options.ts#L5-L26)

```typescript
const cors = corsMiddleware({
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
