import axios from 'axios';
import { Server } from 'http';
import { laminar, withLogger } from '../../src';
import { ContextErrorMetadata } from '../../src/middleware/logger';

let server: Server;

const api = axios.create({ baseURL: 'http://localhost:8098' });

describe('withLogger middleware', () => {
  afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should log path and method ', async () => {
    const mockLogger = { log: jest.fn() };
    server = await laminar({
      port: 8098,
      app: withLogger(mockLogger)(() => {
        throw new Error('Test Error');
      }),
    });

    await expect(api.get('/test/23')).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 500,
      }),
    });

    expect(mockLogger.log).toHaveBeenCalledWith('error', 'Test Error', {
      error: new Error('Test Error'),
      path: '/test/23',
      method: 'GET',
    });
  });

  it('Should not call logger on success', async () => {
    const mockLogger = { log: jest.fn() };
    server = await laminar({
      port: 8098,
      app: withLogger(mockLogger)(() => 'OK'),
    });

    await expect(api.get('/test/23')).resolves.toMatchObject({
      status: 200,
      data: 'OK',
    });

    expect(mockLogger.log).not.toHaveBeenCalled();
  });

  it('Should log other things with a sanitize function ', async () => {
    const mockLogger = { log: jest.fn() };
    const sanitize: ContextErrorMetadata = (error, ctx) => ({
      message: error.message,
      test: ctx.query.test,
    });

    server = await laminar({
      port: 8098,
      app: withLogger(mockLogger, sanitize)(async () => {
        throw new Error('Other Error');
      }),
    });

    await expect(api.get('/test/23?test=other')).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 500,
      }),
    });

    expect(mockLogger.log).toHaveBeenCalledWith('error', 'Other Error', {
      message: 'Other Error',
      test: 'other',
    });
  });
});
