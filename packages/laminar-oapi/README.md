# Laminar Oapi

Open Api implementation for the laminar http server.

### Usage

Docs for open api itself: https://swagger.io/docs/

> [examples/simple.yaml](examples/simple.yaml)

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

> [examples/simple.ts](examples/simple.ts)

```typescript
import { laminar, start, describe, jsonOk } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const api = join(__dirname, 'simple.yaml');

const main = async () => {
  const app = await createOapi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = laminar({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
```

### Additional options

`api` can be a filename, that would be loaded and parsed (json or yaml). Or it can be the an object representing OpenAPI schema directly. Typescript types would be used to validate that object, as well as using the official json schema to validate it at runtime as well.

`paths` an object closely following the oapi `paths` config, with the "method" function being the actual resolver.

All the validations in open api would be run before executing it.

Validations on the response object shape would also be run, and would result in a 500 error if it doesn't match. This would mean that any clients of this api can be 100% certain they would receive objects in the specified shape.

`security` An object implementing the security requirements, specified in the open api config. More on this later.

### Security

When you define OpenAPI security, you can configure a function that implements that security, and it will be automatically applied to all paths / methods that require it.

> [examples/security.yaml](examples/security.yaml)

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

> [examples/security.ts](examples/security.ts)

```typescript
import { laminar, HttpError, describe, jsonOk, start } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const api = join(__dirname, 'simple.yaml');

const main = async () => {
  const app = await createOapi({
    api,
    security: {
      MySecurity: ({ headers }) => {
        if (headers.authorization !== 'Bearer my-secret-token') {
          throw new HttpError(401, { message: 'Unauthorized user' });
        }
        return { email: 'me@example.com' };
      },
    },
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = laminar({ port: 3333, app });
  await start(server);
  console.log(describe(server));
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

You can use [@ovotech/laminar-oapi-cli](../laminar-oapi-cli) package to generate types.

### Undocumented types

You can define additional types that are not defined by openapi schema. You can use the laminar router for that, by placing the routes before the app, so they take precedence.

> [examples/undocumented-routes.ts](examples/undocumented-routes.ts)

```typescript
import { laminar, start, describe, jsonOk, router, get, redirect } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const api = join(__dirname, 'simple.yaml');

const main = async () => {
  const app = await createOapi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });

  const server = laminar({
    port: 3333,
    app: router(
      get('/old/{id}', ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
      app,
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
