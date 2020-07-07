# Axios Oapi

Generate types for REST apis, using information from OpenApi (Swagger) data.

# Usage

You can install the package with yarn (or npm):

```sh
yarn add @ovotech/axios-oapi-cli --dev
```

Then given this OpenApi file:

> [examples/simple.yaml](examples/simple.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: https://simple.example.com
paths:
  '/test/{id}':
    parameters:
      - name: id
        in: path
        schema:
          type: string
        required: true

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

You can run

```sh
yarn axios-oapi --file examples/simple.yaml --output examples/simple.types.ts
```

And would then have:

> [examples/simple.types.ts](examples/simple.types.ts)

```typescript
import { AxiosRequestConfig, AxiosInstance, AxiosResponse } from "axios";

export const axiosOapi = (api: AxiosInstance): AxiosOapiInstance => ({
    "POST /test/{id}": (id: string, data, config) => api.post<Test>(`/test/${id}`, data, config),
    "GET /test/{id}": (id: string, config) => api.get<Test>(`/test/${id}`, config),
    api: api
});

export interface User {
    email: string;
    scopes?: string[];
}

export interface Test {
    text: string;
    user?: User;
    [key: string]: unknown;
}

interface AxiosOapiInstance {
    "POST /test/{id}": (id: string, data: User, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
    "GET /test/{id}": (id: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
    api: AxiosInstance;
}
```

And you can then use it like this:

> [examples/simple.ts](examples/simple.ts)

```typescript
import axios from 'axios';
import { axiosOapi } from './simple.types';
import * as nock from 'nock';

/**
 * Mock the simple rest api so we can test it out
 */
nock('http://simple.example.com')
  .get('/test/20')
  .reply(200, { text: 'test' })
  .post('/test/30')
  .reply(200, { text: 'test', user: { email: 'test@example.com' } });

/**
 * Wrap an axios instance. This will add typed functions with the name of the paths
 */
const simple = axiosOapi(axios.create({ baseURL: 'http://simple.example.com' }));

simple['GET /test/{id}']('20').then(({ data }) => console.log(data));

simple['POST /test/{id}']('30', { email: 'test2example.com' }).then(({ data }) =>
  console.log(data),
);
```

## Complex example

If we use swagger's [petstore.json](examples/petstore.json) example, we can generate the [petstore types](examples/petstore.types.ts) and use them like this:

> [examples/petstore.ts](examples/petstore.ts)

```typescript
import { axiosOapi } from './petstore.types';
import axios from 'axios';

const petstore = axiosOapi(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));

const main = async () => {
  const { data: pixel } = await petstore['PUT /pet']({
    name: 'Pixel',
    photoUrls: ['https://placekitten.com/g/200/300'],
    tags: [{ name: 'axios-oapi-cli' }],
  });

  console.log('SAVED', pixel);

  const { data: retrievedPixel } = await petstore['GET /pet/{petId}'](pixel.id!);

  console.log('RETRIEVED', retrievedPixel);

  // Use the underlying api to perform custom requests
  const { data: inventory } = await petstore.api.get('/store/inventory');
  console.log('INVENTORY', inventory);
};

main();
```

## STDIN / STDOUT and piping

If you don't include "output" the cli will output to stdout. You can use this to chain with other processors like prettier

```sh
yarn axios-oapi --file examples/simple.yaml | prettier --stdin-filepath examples/simple.types.ts > examples/simple.types.ts
```

If you omit the "file" option, stdin will be used. This can be used to pipe the file contents from somewhere else (like curl). By default it will asume the content to be json.

```sh
curl http://example.com/simple.json | yarn axios-oapi --output examples/simple.types.ts
```

You can specify that the openapi content is yaml too:

```sh
curl http://example.com/simple.yaml | yarn axios-oapi --output examples/simple.types.ts --stdin-type yaml
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
