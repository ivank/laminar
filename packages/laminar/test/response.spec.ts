import axios from 'axios';
import { createServer, Server } from 'http';
import { join } from 'path';
import { ReadableMock } from 'stream-mock';
import { file, laminar, message, response } from '../src';

let server: Server;
const api = axios.create({ baseURL: 'http://localhost:8091' });

describe('Requests', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    server = createServer(laminar(() => 'Test'));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'text/plain',
        'content-length': '4',
      }),
      data: 'Test',
    });
  });

  it('Should process json', async () => {
    server = createServer(laminar(() => ({ other: 'stuff' })));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'content-length': '17',
      }),
      data: { other: 'stuff' },
    });
  });

  it('Should process buffer', async () => {
    server = createServer(laminar(() => Buffer.from('test-test-maaaany-test')));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/octet-stream',
        'content-length': '22',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process stream', async () => {
    server = createServer(laminar(() => new ReadableMock(['test-', 'test-', 'maaaany-', 'test'])));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/octet-stream',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process laminar simple response', async () => {
    server = createServer(laminar(() => response({ status: 201 })));
    await new Promise(resolve => server.listen(8091, resolve));

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
    server = createServer(
      laminar(() =>
        response({
          status: 201,
          body: { some: 'stuff' },
          headers: { 'X-Response': 'other' },
          cookies: { me: { value: 'test', httpOnly: true, maxAge: 1000 }, other: 'test2' },
        }),
      ),
    );
    await new Promise(resolve => server.listen(8091, resolve));

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
    server = createServer(laminar(() => message(404, { message: 'test' })));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 404,
        data: { message: 'test' },
      }),
    );
  });

  it('Should process laminar file', async () => {
    server = createServer(laminar(() => file(join(__dirname, 'test.txt'))));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 200,
      data: 'some stuff\n',
    });
  });

  it('Should process laminar file with status', async () => {
    server = createServer(laminar(() => file(join(__dirname, 'test.txt'), { status: 201 })));
    await new Promise(resolve => server.listen(8091, resolve));

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 201,
      data: 'some stuff\n',
    });
  });
});
