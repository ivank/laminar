import axios from 'axios';
import { Server } from 'http';
import {
  del,
  get,
  laminar,
  options,
  patch,
  post,
  put,
  redirect,
  response,
  router,
  message,
} from '../src';
import { LoggerContext, createLogging } from '../src';
import { promisify } from 'util';

let server: Server;

describe('Integration', () => {
  afterEach(() => promisify(server.close.bind(server))());

  it('Should process response', async () => {
    const users: { [key: string]: string } = {
      10: 'John',
      20: 'Tom',
    };
    const loggerMock = { log: jest.fn() };
    const logging = createLogging(loggerMock);
    server = await laminar({
      port: 8050,
      app: logging(
        router<LoggerContext>(
          get('/.well-known/health-check', () => ({ health: 'ok' })),
          get('/link', () => redirect('http://localhost:8050/destination')),
          get('/link-other', () =>
            redirect('http://localhost:8050/destination', {
              headers: { Authorization: 'Bearer 123' },
            }),
          ),
          get('/destination', () => ({ arrived: true })),
          get('/error', () => {
            throw new Error('unknown');
          }),
          options('/users/{id}', () =>
            response({
              headers: {
                'Access-Control-Allow-Origin': 'http://localhost:8050',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE',
              },
            }),
          ),
          get('/users/{id}', ({ path, logger }) => {
            logger.log('debug', `Getting id ${path.id}`);

            if (users[path.id]) {
              return Promise.resolve({ id: path.id, name: users[path.id] });
            } else {
              return message(404, { message: 'No User Found' });
            }
          }),
          put('/users', ({ body, logger }) => {
            logger.log('debug', `Test Body ${body.name}`);
            users[body.id] = body.name;
            return { added: true };
          }),
          patch('/users/{id}', ({ path, body }) => {
            if (users[path.id]) {
              users[path.id] = body.name;
              return { patched: true };
            } else {
              return message(404, { message: 'No User Found' });
            }
          }),
          post('/users/{id}', ({ path, body }) => {
            if (users[path.id]) {
              users[path.id] = body.name;
              return { saved: true };
            } else {
              return message(404, { message: 'No User Found' });
            }
          }),
          del('/users/{id}', ({ path }) => {
            if (users[path.id]) {
              delete users[path.id];
              return { deleted: true };
            } else {
              return message(404, { message: 'No User Found' });
            }
          }),
        ),
      ),
    });

    const api = axios.create({ baseURL: 'http://localhost:8050' });

    await expect(api.get('/unknown-url')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'Path GET /unknown-url not found' },
      }),
    );

    await expect(api.get('/error')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 500,
        data: { message: 'unknown' },
      }),
    );

    await expect(api.get('/.well-known/health-check')).resolves.toMatchObject({
      status: 200,
      data: { health: 'ok' },
    });

    await expect(api.get('/.well-known/health-check/')).resolves.toMatchObject({
      status: 200,
      data: { health: 'ok' },
    });

    await expect(api.get('/.well-known/health-check/other')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'Path GET /.well-known/health-check/other not found' },
      }),
    );

    await expect(api.get('/link')).resolves.toMatchObject({
      status: 200,
      data: { arrived: true },
    });

    await expect(api.get('/link-other')).resolves.toMatchObject({
      status: 200,
      data: { arrived: true },
    });

    await expect(api.request({ url: '/users/10', method: 'OPTIONS' })).resolves.toMatchObject({
      status: 200,
      headers: expect.objectContaining({
        'access-control-allow-methods': 'GET,POST,DELETE',
        'access-control-allow-origin': 'http://localhost:8050',
      }),
    });

    await expect(api.get('/users/10')).resolves.toMatchObject({
      status: 200,
      data: { id: '10', name: 'John' },
    });

    await expect(api.get('/users/20')).resolves.toMatchObject({
      status: 200,
      data: { id: '20', name: 'Tom' },
    });

    await expect(api.get('/users/30')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'No User Found' },
      }),
    );

    await expect(api.post('/users/10', { name: 'Kostas' })).resolves.toMatchObject({
      status: 200,
      data: { saved: true },
    });

    await expect(api.patch('/users/20', { name: 'Pathing' })).resolves.toMatchObject({
      status: 200,
      data: { patched: true },
    });

    await expect(api.get('/users/10')).resolves.toMatchObject({
      status: 200,
      data: { id: '10', name: 'Kostas' },
    });

    await expect(api.delete('/users/10')).resolves.toMatchObject({
      status: 200,
      data: { deleted: true },
    });

    await expect(api.get('/users/10')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'No User Found' },
      }),
    );

    await expect(api.put('/users', { id: 30, name: 'Added' })).resolves.toMatchObject({
      status: 200,
      data: { added: true },
    });

    await expect(api.get('/users/30')).resolves.toMatchObject({
      status: 200,
      data: { id: '30', name: 'Added' },
    });

    const expectedLog = [
      ['info', 'Request', { uri: 'GET /unknown-url', body: '[Stream]' }],
      ['info', 'Response', { status: 404, body: { message: 'Path GET /unknown-url not found' } }],
      ['info', 'Request', { uri: 'GET /error', body: '[Stream]' }],
      ['error', 'Error', { message: 'unknown', stack: expect.any(String) }],
      ['info', 'Request', { uri: 'GET /.well-known/health-check', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: { health: 'ok' } }],
      ['info', 'Request', { uri: 'GET /.well-known/health-check/', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: { health: 'ok' } }],
      ['info', 'Request', { uri: 'GET /.well-known/health-check/other', body: '[Stream]' }],
      [
        'info',
        'Response',
        { status: 404, body: { message: 'Path GET /.well-known/health-check/other not found' } },
      ],
      ['info', 'Request', { uri: 'GET /link', body: '[Stream]' }],
      [
        'info',
        'Response',
        { status: 302, body: 'Redirecting to http://localhost:8050/destination.' },
      ],
      ['info', 'Request', { uri: 'GET /destination', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: { arrived: true } }],
      ['info', 'Request', { uri: 'GET /link-other', body: '[Stream]' }],
      [
        'info',
        'Response',
        { status: 302, body: 'Redirecting to http://localhost:8050/destination.' },
      ],
      ['info', 'Request', { uri: 'GET /destination', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: { arrived: true } }],
      ['info', 'Request', { uri: 'OPTIONS /users/10', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: undefined }],
      ['info', 'Request', { uri: 'GET /users/10', body: '[Stream]' }],
      ['debug', 'Getting id 10'],
      ['info', 'Response', { status: 200, body: { id: '10', name: 'John' } }],
      ['info', 'Request', { uri: 'GET /users/20', body: '[Stream]' }],
      ['debug', 'Getting id 20'],
      ['info', 'Response', { status: 200, body: { id: '20', name: 'Tom' } }],
      ['info', 'Request', { uri: 'GET /users/30', body: '[Stream]' }],
      ['debug', 'Getting id 30'],
      ['info', 'Response', { status: 404, body: { message: 'No User Found' } }],
      ['info', 'Request', { uri: 'POST /users/10', body: { name: 'Kostas' } }],
      ['info', 'Response', { status: 200, body: { saved: true } }],
      ['info', 'Request', { uri: 'PATCH /users/20', body: { name: 'Pathing' } }],
      ['info', 'Response', { status: 200, body: { patched: true } }],
      ['info', 'Request', { uri: 'GET /users/10', body: '[Stream]' }],
      ['debug', 'Getting id 10'],
      ['info', 'Response', { status: 200, body: { id: '10', name: 'Kostas' } }],
      ['info', 'Request', { uri: 'DELETE /users/10', body: '[Stream]' }],
      ['info', 'Response', { status: 200, body: { deleted: true } }],
      ['info', 'Request', { uri: 'GET /users/10', body: '[Stream]' }],
      ['debug', 'Getting id 10'],
      ['info', 'Response', { status: 404, body: { message: 'No User Found' } }],
      ['info', 'Request', { uri: 'PUT /users', body: { id: 30, name: 'Added' } }],
      ['debug', 'Test Body Added'],
      ['info', 'Response', { status: 200, body: { added: true } }],
      ['info', 'Request', { uri: 'GET /users/30', body: '[Stream]' }],
      ['debug', 'Getting id 30'],
      ['info', 'Response', { status: 200, body: { id: '30', name: 'Added' } }],
    ];

    expectedLog.forEach((item, index) => {
      expect(loggerMock.log).toHaveBeenNthCalledWith(index + 1, ...item);
    });
  });
});
