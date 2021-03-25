# Getting Started

Install [@ovotech/laminar](https://github.com/ovotech/laminar/tree/main/packages/laminar) through your favorite (or the one you put up with) package manager:

```shell
yarn add @ovotech/laminar
```

You'll also need typescript, if you don't have it already:

```shell
yarn add typescript --dev
```

We're not done yet. You're here because of all the fancy types and static type checking, you'd be remiss if you didn't go and install the CLI tools: [@ovotech/laminar-cli](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli). Getting the compiler to work for you is fun! It goes to devDependencies though, since you shouldn't need to have it in your deployed service.

```shell
yarn add @ovotech/laminar-cli --dev
```

## Your first simple http listener

Laminar wants to be more than just a rest api, but since that's what its probably most use for, we'll start with a _simple_ http service.

We'll be implementing this [OpenAPI contract](https://swagger.io/specification/). If you're not familiar with it, you can think of it as a pinkey swear of the services, promising to return exactly this data, give exactly those requests. [Json-Schema](https://json-schema.org/learn/getting-started-step-by-step), the languaged used to acomplish this is very powerful, allowing you to express almost anything you'd want out of your rest service.

Today though we'll start with service that just returns a user, given an id.

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

Now comes the good part. Since we've already installed [@ovotech/laminar-cli](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli). We can run it in the command line and get our typescript types directly from openapi yaml.

```shell
yarn laminar api --file api.yaml --output __generated__/api.ts
```

If you want to keep the ts up to date as you're making updates to the yaml file, you can use `--watch` mode:

```shell
yarn laminar api --file api.yaml --output __generated__/api.ts --watch
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
           * Our types would require us to return a 200 json response specifically,
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
   * The http server now should now be running and happily reporting so in the console
   */
  await init({ initOrder: [http], logger: console });
};

main();
```

```shell
yarn tsc index.ts
node index.js
```

## Other examples

You can dive in directly with some example apps:

- [examples/simple](https://github.com/ovotech/laminar/tree/main/examples/simple) Where you see how the most minimal laminar app with generated types can look like
- [examples/security](https://github.com/ovotech/laminar/tree/main/examples/security) With some simple security built in
- [examples/petstore](https://github.com/ovotech/laminar/tree/main/examples/petstore) A minimal but functional petstore implementation - with working jwt security and database access
- [examples/data-loader](https://github.com/ovotech/laminar/tree/main/examples/data-loader) This is a complex example, showing the use of various laminar services (kafka, database, queue).
