![Laminar logo](docs/readme-assets/logo.svg)

# Laminar

A library for building node services in TypeScript. Convert external interfaces into TypeScript types with a cli tool - so that http request / responses would be validated against the OpenApi schema **at compile time**. Supports kafka / schema registry too, for event driven requests.

This is an attempt to implement the concepts of [Design-First, Evolve with Code](https://apisyouwonthate.com/blog/api-design-first-vs-code-first) principles cleanly.

| OpenAPI Definition                               | Service Implementation                           |
| ------------------------------------------------ | ------------------------------------------------ |
| ![OpenAPI Code](docs/readme-assets/api.yaml.png) | ![Http Service](docs/readme-assets/index.ts.png) |

For detailed documentation, refer to https://ovotech.github.com/laminar

## Why?

It works mostly as [express](https://expressjs.com) or [koa](https://koajs.com) but does not use any mutation on any of its requests objects, guaranteing runtime safety. Since all your request handlers and middlewares will be statically typed, if it compiles it will probably run.

Also, all of the external dependancies are created and instantiated by the user. E.g. postgres pools and the like are created by you, and you pass them down to laminar, so it can handle its lifecycle. This allows you to be flexible about where and how you use it.

And lastly there is no external code dependancies, as we only depend on mimetype databases and official openapi definitions.

## Effortless scaling

![A single node, holding multiple services with different team concurrencies](docs/readme-assets/node-instance-single.svg)

Laminar is designed around _Service_ objects that handle different requests - coming from http, kafka, queue managers etc. Each of those _Services_ is able to spawn multiple concurrent workers, that process the requests.

You can easily scale your laminar app by increasing the workers for each _Service_, or increse the instances of your whole node application (thus scaling each _Service_ within the application). If any particular _Service_ demands more resource you can move it to its own Laminar application and scale that separately. Since each worker would be a pure stateless function, so moving them around to differnet packages should be simple enough.

![Multiple nodes holding different services with their own concurrencies](docs/readme-assets/node-instance-split.svg)

This flexibility allows you to either keep all your code in one codebase, but quickly spin it out if size / scale demands it.

A typical laminar app will concist of setting up the various instances that you depend on, like db connections, queues etc. and defining all your business logic in pure functions that contain your business logic. Laminar then works like glue that would hold them together, allowing you full control of each end.

## Middlewares and external Dependencies

![An image illustrating how middlewares work](docs/readme-assets/middlewares.svg)

A key concept in Laminar is the use of middlewares, those are async function wrappers, that can be used to inject dependencies into function calls, while themselves being just functions. Very similar to [express middlewares](https://expressjs.com/en/guide/using-middleware.html), but allowing you to statically define and enforce the types all around.

In practice it ends up looking like dependency injection, that's just function calls and without the magic.

## Installation

You'll need to install `@ovotech/laminar` package:

```shell
yarn add @ovotech/laminar
```

Additionally, if you want to take advantage of the type generation:

```shell
yarn add --dev @ovotech/laminar-cli
```

## A tutorial to get started.

You'll need a very simple OpenAPI schema file, something like:

> [examples/simple/src/api.yaml](https://github.com/ovotech/laminar/tree/main/examples/simple/src/api.yaml)

```yaml
openapi: '3.0.0'
info:
  title: 'Simple Example'
  version: 1.0.0
paths:
  /user/{id}:
    get:
      parameters:
        - name: 'id'
          in: 'path'
          required: true
          schema:
            type: 'string'
            pattern: '\d+'
      responses:
        200:
          description: 'User'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
components:
  schemas:
    UserResponse:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

First we'll generate the types for its so its easier to implement it. Since we've already installed `@ovotech/laminar-cli` we can:

```shell
yarn laminar api --file api.yaml --output __generated__/api.ts
```

> [examples/simple/src/index.ts](https://github.com/ovotech/laminar/tree/main/examples/simple/src/index.ts)

```typescript
import { HttpService, init, jsonOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  /**
   * Since we've already generated this using the api file, the paths,
   * all of its request and response data would be properly typed
   */
  const listener = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path }) => {
          /**
           * Our types would require us to return a 200json response specifically,
           * otherwise it would not compile
           */
          return jsonOk(findUser(path.id));
        },
      },
    },
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   * Default port is 3300
   */
  const http = new HttpService({ listener });

  /**
   * The http server now should be running and indicate that the server is now running
   */
  await init({ initOrder: [http], logger: console });
};

main();
```

## API

Api for laminar and supporting packages: https://ovotech.github.com/laminar/api

## Functioning examples

You can dive in directly with some example apps:

- [examples/simple](https://github.com/ovotech/laminar/tree/main/examples/simple) Where you see how the most minimal laminar app with generated types can look like
- [examples/security](https://github.com/ovotech/laminar/tree/main/examples/security) With some simple security built in
- [examples/petstore](https://github.com/ovotech/laminar/tree/main/examples/petstore) A minimal but functional petstore implementation - with working jwt security and database access
- [examples/data-loader](https://github.com/ovotech/laminar/tree/main/examples/data-loader) Simple but functional example of building a data loading api, using database, kafka and queued request processing.

## More docs

## Packages in this monorepo

- [@ovotech/laminar](https://github.com/ovotech/laminar/tree/main/packages/laminar) - [OpenAPI](https://swagger.io/docs/) http server
- [@ovotech/laminar-cli](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli) - [OpenAPI](https://swagger.io/docs/) type generation for laminar, axios and just plain ts types
- [@ovotech/laminar-handlebars](https://github.com/ovotech/laminar/tree/main/packages/laminar-handlebars) - [handlebars](https://github.com/wycats/handlebars.js/) middleware
- [@ovotech/laminar-jwt](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt) - [JSON Web Token](https://github.com/auth0/node-jsonwebtoken) middleware with jwk, keypairs and keycloack support
- [@ovotech/json-schema](https://github.com/ovotech/laminar/tree/main/packages/json-schema) - Lightweight json-schema validator

## Running the tests

You'll need to start a postgres instance to run the tests for some of the exmaples

```shell
docker-compose up
```

You can then run the tests with:

```shell
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is done by lerna automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
