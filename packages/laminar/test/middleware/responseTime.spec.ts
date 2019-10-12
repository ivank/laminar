import axios from 'axios';
import { Server } from 'http';
import { laminar, createResponseTime } from '../../src';

let server: Server;

const api = axios.create({ baseURL: 'http://localhost:8096' });

describe('createResponseTime middleware', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should measure small response time', async () => {
    server = await laminar({
      port: 8096,
      app: createResponseTime()(async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return 'OK';
      }),
    });

    const result = await api.get('/test');
    expect(result.status).toBe(200);
    expect(Number(result.headers['x-response-time'])).toBeGreaterThan(15);
    expect(Number(result.headers['x-response-time'])).toBeLessThan(55);
  });

  it('Should measure larger response time', async () => {
    server = await laminar({
      port: 8096,
      app: createResponseTime()(async () => {
        await new Promise(resolve => setTimeout(resolve, 55));
        return 'OK';
      }),
    });

    const result = await api.get('/test');

    expect(result.status).toBe(200);
    expect(Number(result.headers['x-response-time'])).toBeGreaterThan(55);
    expect(Number(result.headers['x-response-time'])).toBeLessThan(100);
  });

  it('Should use custom header', async () => {
    server = await laminar({
      port: 8096,
      app: createResponseTime({ header: 'My-Time' })(async () => 'OK'),
    });

    const result = await api.get('/test');

    expect(result.status).toBe(200);
    expect(Number(result.headers['my-time'])).toBeGreaterThan(0);
    expect(Number(result.headers['my-time'])).toBeLessThan(50);
  });
});
