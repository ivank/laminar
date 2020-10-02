import axios from 'axios';
import { httpServer, corsMiddleware, jsonOk, App, start, stop } from '../../src';

const api = axios.create({ baseURL: 'http://localhost:8095' });

const app: App = () => jsonOk({ health: 'ok' });
const asyncApp: App = () => Promise.resolve(jsonOk({ health: 'ok' }));

describe('Cors middleware', () => {
  it('Should allow all by default', async () => {
    const cors = corsMiddleware();
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should add headers on async responses', async () => {
    const cors = corsMiddleware();
    const server = httpServer({ port: 8095, app: cors(asyncApp) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to change allowed methods', async () => {
    const cors = corsMiddleware({ allowMethods: ['GET', 'POST', 'DELETE'] });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,DELETE',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to change allowed credentials', async () => {
    const cors = corsMiddleware({ allowCredentials: true });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-credentials': 'true',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set max age', async () => {
    const cors = corsMiddleware({ maxAge: 1200 });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-max-age': '1200',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set exposed headers', async () => {
    const cors = corsMiddleware({ exposeHeaders: ['Authentication', 'Content-Type'] });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'Authentication,Content-Type',
        }),
      });

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-expose-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set allowed headers directly', async () => {
    const cors = corsMiddleware({ allowHeaders: ['Authentication', 'Content-Type'] });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to infer allowed headers from request headers', async () => {
    const cors = corsMiddleware();
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(
        api.request({
          url: '/test',
          method: 'OPTIONS',
          headers: { 'access-control-request-headers': 'Authentication,Content-Type' },
        }),
      ).resolves.toMatchObject({
        status: 204,
        data: '',
        headers: expect.objectContaining({
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'Authentication,Content-Type',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set origin as string', async () => {
    const cors = corsMiddleware({ allowOrigin: '127.0.0.1' });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({ 'access-control-allow-origin': '127.0.0.1' }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set origin as array', async () => {
    const cors = corsMiddleware({ allowOrigin: ['127.0.0.1', '127.0.0.2'] });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.1',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.2' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.2',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.3' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.0.3 was not one of 127.0.0.1, 127.0.0.2',
        }),
      });

      await expect(api.get('/test')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error matching origin header, none found',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set origin as regex', async () => {
    const cors = corsMiddleware({ allowOrigin: /127\.0\.0\.\d/ });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.1',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.5' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.5',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.1.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.1.1 did not match /127\\.0\\.0\\.\\d/',
        }),
      });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to set origin as function', async () => {
    const cors = corsMiddleware({ allowOrigin: (origin) => origin === '127.0.0.3' });
    const server = httpServer({ port: 8095, app: cors(app) });
    try {
      await start(server);

      await expect(api.get('/test', { headers: { origin: '127.0.0.3' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': '127.0.0.3',
        }),
      });

      await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
        headers: expect.objectContaining({
          'access-control-allow-origin': 'Error, 127.0.0.1 did not match cors function',
        }),
      });
    } finally {
      await stop(server);
    }
  });
});
