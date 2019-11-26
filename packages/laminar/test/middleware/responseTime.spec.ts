import axios from 'axios';
import { createLaminar, createResponseTime, Laminar } from '../../src';

let server: Laminar;

const api = axios.create({ baseURL: 'http://localhost:8096' });

describe('createResponseTime middleware', () => {
  afterEach(() => server.stop());

  it('Should measure small response time', async () => {
    server = createLaminar({
      port: 8096,
      app: createResponseTime()(async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return 'OK';
      }),
    });
    await server.start();

    const result = await api.get('/test');
    expect(result.status).toBe(200);
    expect(Number(result.headers['x-response-time'])).toBeGreaterThan(15);
    expect(Number(result.headers['x-response-time'])).toBeLessThan(55);
  });

  it('Should measure larger response time', async () => {
    server = createLaminar({
      port: 8096,
      app: createResponseTime()(async () => {
        await new Promise(resolve => setTimeout(resolve, 55));
        return 'OK';
      }),
    });
    await server.start();

    const result = await api.get('/test');

    expect(result.status).toBe(200);
    expect(Number(result.headers['x-response-time'])).toBeGreaterThan(55);
    expect(Number(result.headers['x-response-time'])).toBeLessThan(100);
  });

  it('Should use custom header', async () => {
    server = createLaminar({
      port: 8096,
      app: createResponseTime({ header: 'My-Time' })(async () => 'OK'),
    });
    await server.start();

    const result = await api.get('/test');

    expect(result.status).toBe(200);
    expect(Number(result.headers['my-time'])).toBeGreaterThan(0);
    expect(Number(result.headers['my-time'])).toBeLessThan(50);
  });
});
