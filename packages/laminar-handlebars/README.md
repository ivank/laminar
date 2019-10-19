# Laminar Handlebars

Handlebars implementation for the laminar http server.

### Usage

> [examples/html.ts](examples/html.ts)

```typescript
import { laminar, router, get, post, createBodyParser } from '@ovotech/laminar';
import { createHandlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const bodyParser = createBodyParser();
const handlebars = createHandlebars({ dir: join(__dirname, 'templates-html') });

laminar({
  port: 3333,
  app: bodyParser(
    handlebars(
      router(
        get('/', ({ render }) => render('index')),
        post('/result', ({ render, body: { name } }) => render('result', { name })),
      ),
    ),
  ),
});
```

When you set `dir`, it will load and compile templates in `views` and `partials` folders.

### Custom response options

> [examples/yaml.ts](examples/yaml.ts)

```typescript
import { laminar, router, get, createBodyParser } from '@ovotech/laminar';
import { createHandlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const bodyParser = createBodyParser();

const handlebars = createHandlebars({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

laminar({
  port: 3333,
  app: bodyParser(
    handlebars(
      router(
        get('/', ({ render }) => {
          return render('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } });
        }),
        get('/swagger.yaml', ({ render }) => render('swagger.yaml', { version: 10 })),
      ),
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
