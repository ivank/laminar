import axios from 'axios';
import { Server } from 'http';
import { Readable } from 'stream';
import { URLSearchParams } from 'url';
import { laminar } from '../src';
import { promisify } from 'util';

const app = jest.fn().mockReturnValue('Test');
const api = axios.create({ baseURL: 'http://localhost:8051' });

let server: Server;

describe('Requests', () => {
  beforeAll(async () => {
    server = await laminar({ app, port: 8051 });
  });

  afterAll(() => promisify(server.close.bind(server))());

  beforeEach(() => app.mockClear());

  it('Should process request', async () => {
    const result = await api.get('/test2');
    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.objectContaining({ pathname: '/test2' }),
        headers: expect.objectContaining({ host: 'localhost:8051' }),
        method: 'GET',
      }),
    );
    expect(result.status).toEqual(200);
    expect(result.data).toEqual('Test');
  });

  it('Should parse headers', async () => {
    const result = await api.get('/other-test/123', {
      headers: { Authorization: 'Bearer 234' },
    });
    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.objectContaining({ pathname: '/other-test/123' }),
        headers: expect.objectContaining({ authorization: 'Bearer 234' }),
        method: 'GET',
      }),
    );
    expect(result.data).toEqual('Test');
  });

  it('Should parse search query', async () => {
    const result = await api.get('/me', {
      params: { this: 'other', last: 'new' },
    });
    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { this: 'other', last: 'new' },
      }),
    );
    expect(result.data).toEqual('Test');
  });

  it('Should parse nested search query', async () => {
    const result = await api.get('/me?this[one][two]=other&arr[]=111');
    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { this: { one: { two: 'other' } }, arr: ['111'] },
      }),
    );
    expect(result.data).toEqual('Test');
  });

  it('Should parse cookies', async () => {
    const result = await api.get('http://localhost:8051/login', {
      headers: { cookie: 'accessToken=1234abc; userId=1234' },
    });
    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({
        cookies: { accessToken: '1234abc', userId: '1234' },
      }),
    );
    expect(result.data).toEqual('Test');
  });

  it('Should parse json', async () => {
    const result = await api.post('/login', { test: 'other' });

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: { test: 'other' }, method: 'POST' }),
    );
    expect(result.data).toEqual('Test');
  });

  it('Should parse json like', async () => {
    const result = await api.post(
      '/swish',
      { test: 'other' },
      {
        headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
      },
    );

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: { test: 'other' }, method: 'POST' }),
    );

    expect(result.data).toEqual('Test');
  });

  it('Should parse url', async () => {
    const result = await api.post('/logout', 'one=other', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: new URLSearchParams({ one: 'other' }), method: 'POST' }),
    );

    expect(result.data).toEqual('Test');
  });

  it('Should parse text', async () => {
    const result = await api.post('/post', 'document { height: 100%; }', {
      headers: { 'Content-Type': 'text/css' },
    });

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'document { height: 100%; }', method: 'POST' }),
    );

    expect(result.data).toEqual('Test');
  });

  it('Should handle malformed content type', async () => {
    const result = await api.post('http://localhost:8051/post', 'test', {
      headers: { 'Content-Type': '123123' },
    });

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.any(Readable), method: 'POST' }),
    );

    expect(result.data).toEqual('Test');
  });

  it('Should handle unknown content type', async () => {
    const result = await api.post('http://localhost:8051/post', 'test', {
      headers: { 'Content-Type': 'some/other' },
    });

    expect(app).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.any(Readable), method: 'POST' }),
    );

    expect(result.data).toEqual('Test');
  });

  it('Should handle malformed json', async () => {
    await expect(
      api.post('http://localhost:8051/post', '{"test":Date}', {
        transformRequest: [],
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toHaveProperty(
      'response',
      expect.objectContaining({
        status: 400,
        data: {
          message: 'Error parsing request body',
          error: 'Unexpected token D in JSON at position 8',
        },
      }),
    );

    expect(app).not.toHaveBeenCalled();
  });
});
