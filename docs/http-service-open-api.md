# Http Service OpenApi

Laminar comes with with a function that will use an OpenApi file to craete an http listener function, to be used for your HttpService.

## api

> [examples/docs/src/http-service-open-api/simple.ts:(listener)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/simple.ts#L9-L20)

```typescript
const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
};
```

The `openApi` function that implements an OpenApi schema file, needs the schema itself and the path functions, containing the business logic. Since the schema can have references to external files, reading it is an async operation.

`api` can be a JSON file too

> [examples/docs/src/http-service-open-api/json.ts:(api)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/json.ts#L11-L13)

```typescript
api: join(__dirname, '../../schema/api.json'),
```

Or you can use a plain js object. Though in that case we need to use `as const` as otherwise things like `"string"` would not be converted to their respective type literal values, but would remain as a generic `string`.

> [examples/docs/src/http-service-open-api/object.ts:(api)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/object.ts#L8-L43)

```typescript
const api = {
  openapi: '3.0.0',
  info: { title: 'Simple Example', version: '1.0.0' },
  paths: {
    '/user/{id}': {
      get: {
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, pattern: '\\d+' } },
        ],
        responses: {
          '200': {
            description: 'User',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      UserResponse: {
        type: 'object' as const,
        properties: { id: { type: 'string' as const }, name: { type: 'string' as const } },
      },
    },
  },
};

const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api,
    paths: { '/user/{id}': { get: async ({ path }) => jsonOk(findUser(path.id)) } },
  });
};
```

And you can split your OpenAPI schema into multiple files, using json-path. Or even load them from a URL.

> [examples/docs/schema/api-paths.yaml](https://github.com/ivank/laminar/tree/main/examples/docs/schema/api-paths.yaml#L13-L15)

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
                $ref: './api-components.yaml#/schemas/UserResponse'
```

## security

You can implement [OpenApi security](https://swagger.io/docs/specification/authentication/), using the `security` option.

> [examples/docs/schema/security.yaml:(security)](https://github.com/ivank/laminar/tree/main/examples/docs/schema/security.yaml#L25-L30)

```yaml
securitySchemes:
  MySecurity:
    type: http
    scheme: bearer
```

> [examples/docs/src/http-service-open-api/security.ts:(listener)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/security.ts#L9-L26)

```typescript
const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api: join(__dirname, '../../schema/security.yaml'),
    security: {
      MySecurity: async ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : securityError({ message: 'Unauthorized user' }),
    },
    paths: {
      '/user/{id}': {
        get: async ({ path, authInfo }) => jsonOk({ user: findUser(path.id), auth: authInfo }),
      },
    },
  });
};
```

For each `securitySchema` definition in your schema, you will need to write a security resolver, named the same way. Then if your path has a `security` restriction on it in the schema, it will be run before your path function.

The security resolver needs to return a `securityOk` object or a response object. If its a response object (for example `jsonUnauthorized`) it will be returned directly, without running your path function. Otherwise it will run the path function as normal. The contents that you provide inside `securityOk` will be passed as `authInfo` inside your path function. You can use this to pass session / currently logged in user information.

This is a trivial example of a security resolver that you wouldn't use in practice. A more fleshed out example can be seen in [examples/security](https://github.com/ivank/laminar/tree/main/examples/security) that uses JWT tokens.

## notFound

You can define additional paths that are not defined by openapi schema. To do that you can use the `notFound` property, which accepts any laminar app.

> [examples/docs/src/http-service-open-api/not-found.ts:(listener)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/not-found.ts#L6-L20)

```typescript
const createHttpListener = async (): Promise<HttpListener> =>
  router(
    get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
    get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    await openApi({
      api: join(__dirname, '../../schema/api.yaml'),
      paths: {
        '/user/{id}': {
          get: async ({ path }) => jsonOk(findUser(path.id)),
        },
      },
    }),
  );
```

## Middlewares

You will probably want to add some additional props to your openApi context, for access to databases, or other things. In laminar those are accomplished with middlewares.

`openApi` function has a generic type interface that you can assign, to be used by all the path functions.

> [examples/docs/src/http-service-open-api/middlewares.ts:(app)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/middlewares.ts#L9-L34)

```typescript
const createHttpListener = async () => {
  return await openApi<LoggerContext<Console>>({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path, logger }) => {
          logger.info(`Accessed ${path.id}`);
          return jsonOk(findUser(path.id));
        },
      },
    },
  });
};

const createApplication = async (): Promise<Application> => {
  /**
   * Some custom logger, to be passed using a middleware
   */
  const logger = console;
  const withLogger = loggerMiddleware(logger);

  const service = new HttpService({ listener: withLogger(await createHttpListener()) });
  return { initOrder: [service], logger };
};
```

## Type generation

You can install `@laminar/cli` package to generate types for your OpenApi http listener.

```shell
yarn add --dev @laminar/cli
yarn laminar api --file schema/api.yaml --output src/__generated/api.yaml.ts
```

> [examples/docs/src/http-service-open-api/simple-typed.ts:(listener)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/simple-typed.ts#L9-L22)

```typescript
import { openApiTyped } from './__generated__/api.yaml';

const createHttpListener = async (): Promise<HttpListener> => {
  return await openApiTyped({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
};
```

`openApiTyped` is used the same way as `openApi` but provides strict types for both requests and responses of its path functions.

Providing context types works the same too.

> [examples/docs/src/http-service-open-api/middlewares-typed.ts:(app)](https://github.com/ivank/laminar/tree/main/examples/docs/src/http-service-open-api/middlewares-typed.ts#L9-L25)

```typescript
import { openApiTyped } from './__generated__/api.yaml';

const createHttpListener = async () => {
  return await openApiTyped<LoggerContext<Console>>({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path, logger }) => {
          logger.info(`Accessed ${path.id}`);
          return jsonOk(findUser(path.id));
        },
      },
    },
  });
};
```
