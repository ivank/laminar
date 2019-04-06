import { createServer, Server } from 'http';
import fetch from 'node-fetch';
import { ReadableMock } from 'stream-mock';
import { laminar, response } from '../src';

let server: Server;

describe('Requests', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should process response', async () => {
    server = createServer(laminar(() => 'Test'));
    await new Promise(resolve => server.listen(8091, resolve));

    const result = await fetch('http://localhost:8091/test');

    expect(result.headers.get('content-type')).toEqual('text/plain');
    expect(result.headers.get('content-length')).toEqual('4');
    await expect(result.text()).resolves.toEqual('Test');
  });

  it('Should process json', async () => {
    server = createServer(laminar(() => ({ other: 'stuff' })));
    await new Promise(resolve => server.listen(8091, resolve));

    const result = await fetch('http://localhost:8091/test');

    expect(result.headers.get('content-type')).toEqual('application/json');
    expect(result.headers.get('content-length')).toEqual('17');
    await expect(result.json()).resolves.toEqual({ other: 'stuff' });
  });

  it('Should process buffer', async () => {
    server = createServer(laminar(() => new Buffer('test-test-maaaany-test')));
    await new Promise(resolve => server.listen(8091, resolve));

    const result = await fetch('http://localhost:8091/test');
    expect(result.headers.get('content-type')).toEqual('application/octet-stream');
    expect(result.headers.get('content-length')).toEqual('22');

    await expect(result.text()).resolves.toEqual('test-test-maaaany-test');
  });

  it('Should process stream', async () => {
    server = createServer(laminar(() => new ReadableMock(['test-', 'test-', 'maaaany-', 'test'])));
    await new Promise(resolve => server.listen(8091, resolve));

    const result = await fetch('http://localhost:8091/test');
    expect(result.headers.get('content-type')).toEqual('application/octet-stream');
    expect(result.headers.get('content-length')).toEqual(null);

    await expect(result.text()).resolves.toEqual('test-test-maaaany-test');
  });

  it('Should process laminar response', async () => {
    server = createServer(
      laminar(() =>
        response({ status: 201, body: { some: 'stuff' }, headers: { 'X-Response': 'other' } }),
      ),
    );
    await new Promise(resolve => server.listen(8091, resolve));

    const result = await fetch('http://localhost:8091/test');
    expect(result.status).toEqual(201);
    expect(result.headers.get('content-type')).toEqual('application/json');
    expect(result.headers.get('content-length')).toEqual('16');
    expect(result.headers.get('X-Response')).toEqual('other');

    await expect(result.json()).resolves.toEqual({ some: 'stuff' });
  });
});
