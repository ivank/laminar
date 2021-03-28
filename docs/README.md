# Laminar

A library for building node services in TypeScript. Convert external interfaces into TypeScript types with a cli tool - so that http request / responses would be validated against the OpenApi schema **at compile time**. Supports kafka / schema registry too, for event driven requests.

This is an attempt to implement the concepts of [Design-First, Evolve with Code](https://apisyouwonthate.com/blog/api-design-first-vs-code-first) principles cleanly.

## Why?

It works mostly as [express](https://expressjs.com) or [koa](https://koajs.com) but does not use any mutation on any of its requests objects, guaranteing runtime safety. Since all your request handlers and middlewares will be statically typed, if it compiles it will probably run.

All of the external dependancies are created and instantiated by the user. E.g. postgres pools and the like are created by you, and you pass them down to laminar, so it can handle its lifecycle. This allows you to be flexible about where and how you use it.

You can scale things up or down, by adding all of your code into a single instance with lots of workers, or by splitting them up into separate node instance, and everything in between.

And lastly there is almost no external code dependancies, as we only depend on mimetype databases and official openapi definitions and [axios](https://github.com/axios/axios) for fetching data.

## Installation

You'll need to install `@ovotech/laminar` package:

```shell
yarn add @ovotech/laminar
```

Additionally, if you want to take advantage of the type generation:

```shell
yarn add @ovotech/laminar-cli
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
 * A simple function to get some data out of a data store, think databases and the like.
 * Though for bravity it just returns a static js object.
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
           * Our types would require us to return a 200 json response specifically,
           * otherwise it would not compile. That's what `jsonOk` function does.
           */
          return jsonOk(findUser(path.id));
        },
      },
    },
  });

  /**
   * Now we need to create the Http Service that would call our listener.
   * Its a very shallow wrapper around `http.createService` from node
   * Default port is 3300
   */
  const http = new HttpService({ listener });

  /**
   * We can now start it by calling `init`.
   * Output would then be sent to the logger we've specified: node's console.
   */
  await init({ initOrder: [http], logger: console });
};

main();
```

## API

Detailed api for laminar and supporting packages: https://ovotech.github.com/laminar/api/index.html

## Functioning examples

You can dive in directly with some example apps:

- [examples/simple](https://github.com/ovotech/laminar/tree/main/examples/simple) Where you see how the most minimal laminar app with generated types can look like
- [examples/security](https://github.com/ovotech/laminar/tree/main/examples/security) With some simple security built in
- [examples/petstore](https://github.com/ovotech/laminar/tree/main/examples/petstore) A minimal but functional petstore implementation - with working jwt security and database access
- [examples/comms](https://github.com/ovotech/laminar/tree/main/examples/comms) An api that holds some state for an external email api.
- [examples/data-loader](https://github.com/ovotech/laminar/tree/main/examples/data-loader) This is a complex example, showing the use of various laminar services (kafka, database, queue).

## Packages in this monorepo

Laminar includes packages that are used internally or are additions to its core features.

- [@ovotech/laminar](https://github.com/ovotech/laminar/tree/packages/laminar) - [OpenAPI](https://swagger.io/docs/) http server
- [@ovotech/laminar-cli](https://github.com/ovotech/laminar/tree/packages/laminar-cli) - [OpenAPI](https://swagger.io/docs/) type generation
- [@ovotech/laminar-handlebars](https://github.com/ovotech/laminar/tree/packages/laminar-handlebars) - [handlebars](https://github.com/wycats/handlebars.js/) middleware
- [@ovotech/laminar-jwt](https://github.com/ovotech/laminar/tree/packages/laminar-handlebars) - [JSON Web Token](https://github.com/auth0/node-jsonwebtoken) middleware
- [@ovotech/json-schema](https://github.com/ovotech/laminar/tree/packages/json-schema) - Lightweight json-schema validator
- [@ovotech/laminar-pg](https://github.com/ovotech/laminar/tree/packages/laminar-pg) - Connect to postgres db
- [@ovotech/laminar-winstong](https://github.com/ovotech/laminar/tree/packages/laminar-winstong) - Use winston logger
- [@ovotech/laminar-kafkajs](https://github.com/ovotech/laminar/tree/packages/laminar-winstong) - Use kafkajs to consumer and produce kafka messages, with schema registry support
- [@ovotech/laminar-pgboss](https://github.com/ovotech/laminar/tree/packages/laminar-winstong) - Use pgboss to schedule jobs
