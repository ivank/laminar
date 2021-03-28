import { HttpListener, HttpService, init, jsonOk, openApi } from '@ovotech/laminar';

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
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '\\d+' } }],
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
      UserResponse: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
    },
  },
} as const;

const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api,
    paths: { '/user/{id}': { get: async ({ path }) => jsonOk(findUser(path.id)) } },
  });
};
// api

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
