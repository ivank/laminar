import axios from 'axios';
import { join } from 'path';
import { ObjectReadableMock } from 'stream-mock';
import {
  file,
  laminar,
  start,
  text,
  textOk,
  stop,
  Laminar,
  json,
  jsonOk,
  binary,
  ok,
  setCookie,
  jsonNotFound,
} from '../src';

let server: Laminar;
const api = axios.create({ baseURL: 'http://localhost:8052' });

describe('Requests', () => {
  afterEach(() => stop(server));

  it('Should process response', async () => {
    server = laminar({ port: 8052, app: () => textOk('Test') });
    await start(server);

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'text/plain',
        'content-length': '4',
      }),
      data: 'Test',
    });
  });

  it('Should process json', async () => {
    server = laminar({ port: 8052, app: () => jsonOk({ other: 'stuff' }) });
    await start(server);

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'content-length': '17',
      }),
      data: { other: 'stuff' },
    });
  });

  it('Should process buffer', async () => {
    server = laminar({
      port: 8052,
      app: () => binary(ok({ body: Buffer.from('test-test-maaaany-test') })),
    });
    await start(server);

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'application/octet-stream',
        'content-length': '22',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process stream', async () => {
    server = laminar({
      port: 8052,
      app: () => textOk(new ObjectReadableMock(['test-', 'test-', 'maaaany-', 'test'])),
    });
    await start(server);

    await expect(api.get('/test')).resolves.toMatchObject({
      headers: expect.objectContaining({
        'content-type': 'text/plain',
      }),
      data: 'test-test-maaaany-test',
    });
  });

  it('Should process laminar simple response', async () => {
    server = laminar({ port: 8052, app: () => text({ body: '', status: 201 }) });
    await start(server);

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
    server = laminar({
      port: 8052,
      app: () =>
        setCookie(
          { me: { value: 'test', httpOnly: true, maxAge: 1000 }, other: 'test2' },
          json({ body: { some: 'stuff' }, status: 201, headers: { 'X-Response': 'other' } }),
        ),
    });
    await start(server);

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
    server = laminar({
      port: 8052,
      app: () => jsonNotFound({ message: 'test' }),
    });
    await start(server);

    await expect(api.get('/test').catch((error) => error.response)).resolves.toMatchObject({
      status: 404,
      data: { message: 'test' },
    });
  });

  it('Should process laminar text file', async () => {
    server = laminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.txt')),
    });
    await start(server);

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
    server = laminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.html')),
    });
    await start(server);

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
    server = laminar({
      port: 8052,
      app: () => file(join(__dirname, 'test.txt'), { status: 201 }),
    });
    await start(server);

    await expect(api.get('/test')).resolves.toMatchObject({
      status: 201,
      data: 'some stuff\n',
    });
  });
});
