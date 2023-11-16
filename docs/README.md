# Laminar

A library for building node services in TypeScript. Convert external interfaces into TypeScript types with a cli tool - so that http request / responses would be validated against the OpenApi schema **at compile time**. Supports kafka / schema registry too, for event driven requests.

This is an attempt to implement the concepts of [Design-First, Evolve with Code](https://apisyouwonthate.com/blog/api-design-first-vs-code-first) principles cleanly.

## Why?

It works mostly as [express](https://expressjs.com) or [koa](https://koajs.com) but does not use any mutation on any of its requests objects, guaranteing runtime safety. Since all your request handlers and middlewares will be statically typed, if it compiles it will probably run.

All of the external dependancies are created and instantiated by the user. E.g. postgres pools and the like are created by you, and you pass them down to laminar, so it can handle its lifecycle. This allows you to be flexible about where and how you use it.

You can scale things up or down, by adding all of your code into a single instance with lots of workers, or by splitting them up into separate node instance, and everything in between.

And lastly there is almost no external code dependancies, as we only depend on mimetype databases and official openapi definitions and [axios](https://github.com/axios/axios) for fetching data.

## Installation

You'll need to install `@laminarjs/laminar` package:

```shell
yarn add @laminarjs/laminar
```

Additionally, if you want to take advantage of the type generation:

```shell
yarn add @laminarjs/cli
```

## A tutorial to get started.

You'll need a very simple OpenAPI schema file, something like:

> [examples/simple/src/api.yaml](https://github.com/ivank/laminar/tree/main/examples/simple/src/api.yaml)

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

First we'll generate the types for its so its easier to implement it. Since we've already installed `@laminarjs/cli` we can:

```shell
yarn laminar api --file api.yaml --output __generated__/api.ts
```

> [examples/simple/src/index.ts](https://github.com/ivank/laminar/tree/main/examples/simple/src/index.ts)

```typescript
import { HttpService, init, jsonOk } from '@laminarjs/laminar';
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

Detailed api for laminar and supporting packages: https://ivank.github.io/laminar/api/index.html

## Functioning examples

You can dive in directly with some example apps:

- [examples/simple](https://github.com/ivank/laminar/tree/main/examples/simple) Where you see how the most minimal laminar app with generated types can look like
- [examples/security](https://github.com/ivank/laminar/tree/main/examples/security) With some simple security built in
- [examples/petstore](https://github.com/ivank/laminar/tree/main/examples/petstore) A minimal but functional petstore implementation - with working jwt security and database access
- [examples/comms](https://github.com/ivank/laminar/tree/main/examples/comms) An api that holds some state for an external email api.
- [examples/data-loader](https://github.com/ivank/laminar/tree/main/examples/data-loader) This is a complex example, showing the use of various laminar services (kafka, database, queue).

## Packages in this monorepo

Laminar includes packages that are used internally or are additions to its core features.

- [@laminarjs/laminar](https://github.com/ivank/laminar/tree/main/packages/laminar) - [OpenAPI](https://swagger.io/docs/) http server
- [@laminarjs/cli](https://github.com/ivank/laminar/tree/main/packages/cli) - [OpenAPI](https://swagger.io/docs/) type generation
- [@laminarjs/handlebars](https://github.com/ivank/laminar/tree/main/packages/handlebars) - [handlebars](https://github.com/wycats/handlebars.js/) middleware
- [@laminarjs/jwt](https://github.com/ivank/laminar/tree/main/packages/handlebars) - [JSON Web Token](https://github.com/auth0/node-jsonwebtoken) middleware
- [@laminarjs/json-schema](https://github.com/ivank/laminar/tree/main/packages/json-schema) - Lightweight json-schema validator
- [@laminarjs/pg](https://github.com/ivank/laminar/tree/main/packages/pg) - Connect to postgres db
- [@laminarjs/winston](https://github.com/ivank/laminar/tree/main/packages/winston) - Use winston logger
- [@laminarjs/kafkajs](https://github.com/ivank/laminar/tree/main/packages/kafkajs) - Use kafkajs to consumer and produce kafka messages, with schema registry support
- [@laminarjs/pgboss](https://github.com/ivank/laminar/tree/main/packages/pgboss) - Use pgboss to schedule jobs
- [@laminarjs/fixtures](https://github.com/ivank/laminar/tree/main/packages/fixtures) - Fixtures for pg with relationships
