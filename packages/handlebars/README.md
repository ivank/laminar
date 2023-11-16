# Laminar Handlebars

Handlebars implementation for the laminar http server.

### Usage

> [examples/html.ts](https://github.com/ivank/laminar/tree/main/packages/handlebars/examples/html.ts)

```typescript
import { init, router, get, post, HttpService, htmlOk } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

const server = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => htmlOk(hbs('index'))),
      post('/result', async ({ hbs, body: { name } }) => htmlOk(hbs('result', { name }))),
    ),
  ),
});

init({ initOrder: [server], logger: console });
```

When you set `dir`, it will load and compile templates in `views` and `partials` folders.

Creating the middleware would crawl through the directory and all of its subdirectories, extracting handlebar files and compiling them.

### Custom response options

> [examples/yaml.ts](https://github.com/ivank/laminar/tree/main/packages/handlebars/examples/yaml.ts)

```typescript
import { init, router, get, HttpService, yamlOk, yamlBadRequest } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-yaml'), views: 'yaml', extension: 'hbr' });

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => yamlBadRequest(hbs('index.yaml'), { 'X-Index': 'true' })),
      get('/swagger.yaml', async ({ hbs }) => yamlOk(hbs('swagger.yaml', { version: 10 }))),
    ),
  ),
});

init({ initOrder: [http], logger: console });
```

### Usage without middleware

You can also create the handblebars renderer directly without going through a middleware

> [examples/direct.ts](https://github.com/ivank/laminar/tree/main/packages/handlebars/examples/direct.ts)

```typescript
import { init, router, get, post, HttpService, htmlOk } from '@laminar/laminar';
import { handlebars } from '@laminar/handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const http = new HttpService({
  listener: router(
    get('/', async () => htmlOk(hbs('index'))),
    post('/result', async ({ body: { name } }) => htmlOk(hbs('result', { name }))),
  ),
});

init({ initOrder: [http], logger: console });
```

### Caching options

By default handlebars middleware would preload all the templates and keep them in memory, but you can control the caching behaviour with the `cacheType` option. Possible values:

- `preload` - load all the templates ones into memory
- `expiry` - load partials when needed and keep them in cache, but check the file's mtime and reload template if changed
- `none` - do not cache templates and load them on every request.

> [examples/expiry-cache.ts](https://github.com/ivank/laminar/tree/main/packages/handlebars/examples/expiry-cache.ts)

```typescript
import { init, router, get, post, HttpService, htmlOk } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html'), cacheType: 'expiry' });

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => htmlOk(hbs('index'))),
      post('/result', async ({ hbs, body: { name } }) => htmlOk(hbs('result', { name }))),
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

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](https://github.com/ivank/laminar/tree/main/packages/handlebars/test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](https://github.com/ivank/laminar/tree/main/packages/handlebars/LICENSE) file for details
