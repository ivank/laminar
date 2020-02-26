# Laminar Oapi CLI

A CLI for the Open Api implementation for the laminar http server.

### Usage

Given a OpenAPI config file:

> [examples/oapi.yaml](examples/oapi.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/test':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  schemas:
    User:
      additionalProperties: false
      properties:
        email:
          type: string
        scopes:
          type: array
          items:
            type: string
      required:
        - email

    Test:
      properties:
        text:
          type: string
        user:
          $ref: '#/components/schemas/User'
      required:
        - text
```

We can run:

```
yarn laminar-oapi oapi.yaml oapi.yaml.ts
```

Which would convert a given `oapi.yaml` file to a `oapi.yaml.ts`. Any external urls, referenced in it would be downloaded, and any local file references would be loaded as well.

Then you can load the types like this:

> [examples/simple.ts](examples/simple.ts)

```typescript
import { createLaminar, createBodyParser, describeLaminar } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';
import { Config } from './oapi.yaml';

const start = async () => {
  const config: Config = {
    api: join(__dirname, 'oapi.yaml'),
    paths: {
      '/test': {
        post: ({ body }) => ({ text: 'ok', user: body }),
        get: () => ({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  };
  const bodyParser = createBodyParser();
  const app = await createOapi(config);
  const laminar = createLaminar({ port: 3333, app: bodyParser(app) });
  await laminar.start();
  console.log(describeLaminar(laminar));
};

start();
```

### Watching for changes

You can also watch for changes and regenerate the typescript types with the `--watch` flag

```
yarn laminar-oapi --watch oapi.yaml oapi.yaml.ts
```

When you update the source yaml file, or any of the local files it references, `laminar-oapi` would rebuild the typescript files.

### Generating types

You can use `@ovotech/laminar-oapi-cli` package to generate types.

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
