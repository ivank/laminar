import { createLaminar, createBodyParser } from '@ovotech/laminar';
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

const start = async () => {
  const bodyParser = createBodyParser();
  const app = await createOapi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => ({ result: 'ok', user: body }),
        get: () => ({ email: 'me@example.com' }),
      },
    },
  });
  const laminar = createLaminar({ port: 3333, app: bodyParser(app) });
  await laminar.start();
  console.log('Started', laminar.server.address());
};

start();
