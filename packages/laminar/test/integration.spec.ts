import axios from 'axios';
import { createServer, Server } from 'http';
import {
  del,
  get,
  HttpError,
  laminar,
  options,
  patch,
  post,
  put,
  redirect,
  response,
  router,
} from '../src';
import { LoggerContext, withLogger } from './middleware/logger';

let server: Server;

interface Item {
  id: string;
  name: string;
}

interface TestContext extends LoggerContext {
  body: Item;
}

describe('Integration', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    const users: any = {
      10: 'John',
      20: 'Tom',
    };
    const loggerFunc = jest.fn();
    server = createServer(
      laminar(
        withLogger(loggerFunc)(
          router(
            get('/.well-known/health-check', () => ({ health: 'ok' })),
            get('/link', () => redirect('http://localhost:8092/destination')),
            get('/link-other', () =>
              redirect('http://localhost:8092/destination', {
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
                  'Access-Control-Allow-Origin': 'http://localhost:8092',
                  'Access-Control-Allow-Methods': 'GET,POST,DELETE',
                },
              }),
            ),
            get('/users/{id}', ({ path, logger }) => {
              logger(`Getting id ${path.id}`);

              if (users[path.id]) {
                return { id: path.id, name: users[path.id] };
              } else {
                throw new HttpError(404, { message: 'No User Found' });
              }
            }),
            put<TestContext>('/users', ({ body, logger }) => {
              logger(`Test Body ${body.name}`);
              users[body.id] = body.name;
              return { added: true };
            }),
            patch<TestContext>('/users/{id}', ({ path, body }) => {
              if (users[path.id]) {
                users[path.id] = body.name;
                return { patched: true };
              } else {
                throw new HttpError(404, { message: 'No User Found' });
              }
            }),
            post<TestContext>('/users/{id}', ({ path, body }) => {
              if (users[path.id]) {
                users[path.id] = body.name;
                return { saved: true };
              } else {
                throw new HttpError(404, { message: 'No User Found' });
              }
            }),
            del('/users/{id}', ({ path }) => {
              if (users[path.id]) {
                delete users[path.id];
                return { deleted: true };
              } else {
                throw new HttpError(404, { message: 'No User Found' });
              }
            }),
          ),
        ),
      ),
    );

    await new Promise(resolve => server.listen(8092, resolve));
    const api = axios.create({ baseURL: 'http://localhost:8092' });

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
        'access-control-allow-origin': 'http://localhost:8092',
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

    expect(loggerFunc).toHaveBeenNthCalledWith(1, 'Getting id 10');
    expect(loggerFunc).toHaveBeenNthCalledWith(2, 'Getting id 20');
    expect(loggerFunc).toHaveBeenNthCalledWith(3, 'Getting id 30');
    expect(loggerFunc).toHaveBeenNthCalledWith(4, 'Getting id 10');
    expect(loggerFunc).toHaveBeenNthCalledWith(5, 'Getting id 10');
    expect(loggerFunc).toHaveBeenNthCalledWith(6, 'Test Body Added');
    expect(loggerFunc).toHaveBeenNthCalledWith(7, 'Getting id 30');
  });
});
