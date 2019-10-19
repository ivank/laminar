import { laminar, HttpError, createBodyParser } from '@ovotech/laminar';
import { createOapi, OpenAPIObject } from '@ovotech/laminar-oapi';

const api: OpenAPIObject = {
  openapi: '3.0.0',
  info: { title: 'Simple API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3333' }],
  paths: {
    '/user': {
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/User' } },
          },
        },
        security: [{ MySecurity: ['admin'] }],
        responses: {
          '200': {
            description: 'Newly Created User',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/NewUser' } },
            },
          },
        },
      },
      get: {
        security: [{ MySecurity: [] }],
        responses: {
          '200': {
            description: 'Loaded User',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      MySecurity: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      User: {
        properties: {
          email: { type: 'string' },
        },
        required: ['email'],
      },
      NewUser: {
        properties: {
          result: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['result', 'user'],
      },
    },
  },
};

const start = async (): Promise<void> => {
  const bodyParser = createBodyParser();
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
        post: ({ body }) => ({ result: 'ok', user: body }),
        get: () => ({ email: 'me@example.com' }),
      },
    },
  });
  const server = await laminar({ port: 3333, app: bodyParser(app) });
  console.log('Started', server.address());
};

start();
