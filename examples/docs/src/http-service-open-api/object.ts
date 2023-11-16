import { HttpListener, HttpService, init, jsonOk, openApi } from '@laminarjs/laminar';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

// << api
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
// api

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
