import axios from 'axios';
import { Server } from 'http';
import { laminar, withCors } from '../../src';

let server: Server;

const api = axios.create({ baseURL: 'http://localhost:8095' });

const app = () => ({ health: 'ok' });

describe('Cors middleware', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should allow all by default', async () => {
    server = await laminar({ port: 8095, app: withCors()(app) });

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
  });

  it('Should be able to change allowed methods', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowMethods: ['GET', 'POST', 'DELETE'] })(app),
    });

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
  });

  it('Should be able to change allowed credentials', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowCredentials: true })(app),
    });

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
  });

  it('Should be able to set max age', async () => {
    server = await laminar({ port: 8095, app: withCors({ maxAge: 1200 })(app) });

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
  });

  it('Should be able to set exposed headers', async () => {
    server = await laminar({
      port: 8095,

      app: withCors({ exposeHeaders: ['Authentication', 'Content-Type'] })(app),
    });

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
  });

  it('Should be able to set allowed headers directly', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowHeaders: ['Authentication', 'Content-Type'] })(app),
    });

    await expect(api.request({ url: '/test', method: 'OPTIONS' })).resolves.toMatchObject({
      status: 204,
      data: '',
      headers: expect.objectContaining({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        'access-control-allow-headers': 'Authentication,Content-Type',
      }),
    });
  });

  it('Should be able to infer allowed headers from request headers', async () => {
    server = await laminar({ port: 8095, app: withCors()(app) });

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
  });

  it('Should be able to set origin as string', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowOrigin: '127.0.0.1' })(app),
    });

    await expect(api.get('/test', { headers: { origin: '127.0.0.1' } })).resolves.toMatchObject({
      status: 200,
      data: { health: 'ok' },
      headers: expect.objectContaining({
        'access-control-allow-origin': '127.0.0.1',
      }),
    });
  });

  it('Should be able to set origin as array', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowOrigin: ['127.0.0.1', '127.0.0.2'] })(app),
    });

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

    await expect(
      api.get('/test', { headers: { origin: ['127.0.0.3', '127.0.0.4'] } }),
    ).resolves.toMatchObject({
      status: 200,
      data: { health: 'ok' },
      headers: expect.not.objectContaining({
        'access-control-allow-origin': expect.anything(),
      }),
    });

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 200,
      data: { health: 'ok' },
      headers: expect.not.objectContaining({
        'access-control-allow-origin': expect.anything(),
      }),
    });
  });

  it('Should be able to set origin as regex', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowOrigin: /127\.0\.0\.\d/ })(app),
    });

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
      headers: expect.not.objectContaining({
        'access-control-allow-origin': expect.anything(),
      }),
    });
  });

  it('Should be able to set origin as function', async () => {
    server = await laminar({
      port: 8095,
      app: withCors({ allowOrigin: origin => origin === '127.0.0.3' })(app),
    });

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
      headers: expect.not.objectContaining({
        'access-control-allow-origin': expect.anything(),
      }),
    });
  });
});
