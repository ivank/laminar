# Laminar Handlebars

Handlebars implementation for the laminar http server.

### Usage

> [examples/html.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/examples/html.ts)

```typescript
import { init, router, get, post, HttpService } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

const server = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => hbs('index')),
      post('/result', async ({ hbs, body: { name } }) => hbs('result', { name })),
    ),
  ),
});

init({ initOrder: [server], logger: console });
```

When you set `dir`, it will load and compile templates in `views` and `partials` folders.

Creating the middleware would crawl through the directory and all of its subdirectories, extracting handlebar files and compiling them.

### Custom response options

> [examples/yaml.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/examples/yaml.ts)

```typescript
import { init, router, get, HttpService } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => hbs('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } })),
      get('/swagger.yaml', async ({ hbs }) => hbs('swagger.yaml', { version: 10 })),
    ),
  ),
});

init({ initOrder: [http], logger: console });
```

### Usage without middleware

You can also create the handblebars renderer directly without going through a middleware

> [examples/direct.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/examples/direct.ts)

```typescript
import { init, router, get, post, HttpService } from '@ovotech/laminar';
import { handlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const http = new HttpService({
  listener: router(
    get('/', async () => hbs('index')),
    post('/result', async ({ body: { name } }) => hbs('result', { name })),
  ),
});

init({ initOrder: [http], logger: console });
```

### Caching options

By default handlebars middleware would preload all the templates and keep them in memory, but you can control the caching behaviour with the `cacheType` option. Possible values:

- `preload` - load all the templates ones into memory
- `expiry` - load partials when needed and keep them in cache, but check the file's mtime and reload template if changed
- `none` - do not cache templates and load them on every request.

> [examples/expiry-cache.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/examples/expiry-cache.ts)

```typescript
import { init, router, get, post, HttpService } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html'), cacheType: 'expiry' });

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => hbs('index')),
      post('/result', async ({ hbs, body: { name } }) => hbs('result', { name })),
    ),
  ),
});

init({ initOrder: [http], logger: console });
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

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars/LICENSE) file for details
