import axios from 'axios';
import { join } from 'path';
import { ObjectReadableMock } from 'stream-mock';
import { file, createLaminar, message, response, Laminar } from '../src';

let server: Laminar;
const api = axios.create({ baseURL: 'http://localhost:8052' });

describe('Requests', () => {
  afterEach(() => server.stop());

  it('Should process response', async () => {
    server = createLaminar({ port: 8052, app: () => 'Test' });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'text/plain',
        'content-length': '4',
      }),
      data: 'Test',
    });
  });

  it('Should process json', async () => {
    server = createLaminar({ port: 8052, app: () => ({ other: 'stuff' }) });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'content-length': '17',
      }),
      data: { other: 'stuff' },
    });
  });

  it('Should process buffer', async () => {
    server = createLaminar({
      port: 8052,
      app: () => Buffer.from('test-test-maaaany-test'),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/octet-stream',
        'content-length': '22',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process stream', async () => {
    server = createLaminar({
      port: 8052,
      app: () => new ObjectReadableMock(['test-', 'test-', 'maaaany-', 'test']),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/octet-stream',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process laminar simple response', async () => {
    server = createLaminar({ port: 8052, app: () => response({ status: 201 }) });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 201,
      headers: expect.objectContaining({
        'content-type': 'text/plain',
        'content-length': '0',
      }),
      data: '',
    });
  });

  it('Should process laminar response', async () => {
    server = createLaminar({
      port: 8052,
      app: () =>
        response({
          status: 201,
          body: { some: 'stuff' },
          headers: { 'X-Response': 'other' },
          cookies: { me: { value: 'test', httpOnly: true, maxAge: 1000 }, other: 'test2' },
        }),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 201,
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'content-length': '16',
        'set-cookie': ['me=test; Max-Age=1000; HttpOnly', 'other=test2'],
        'x-response': 'other',
      }),
      data: { some: 'stuff' },
    });
  });

  it('Should process laminar message', async () => {
    server = createLaminar({
      port: 8052,
      app: () => message(404, { message: 'test' }),
    });
    await server.start();

    await expect(api.get('/test')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'test' },
      }),
    );
  });

  it('Should process laminar text file', async () => {
    server = createLaminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.txt')),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 200,
      headers: expect.objectContaining({
        'content-length': '11',
        'content-type': 'text/plain',
      }),
      data: 'some stuff\n',
    });
  });

  it('Should process laminar html file', async () => {
    server = await createLaminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.html')),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 200,
      headers: expect.objectContaining({
        'content-length': '14',
        'content-type': 'text/html',
      }),
      data: '<html></html>\n',
    });
  });

  it('Should process laminar file with status', async () => {
    server = createLaminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    await server.start();

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 201,
      data: 'some stuff\n',
    });
  });
});
