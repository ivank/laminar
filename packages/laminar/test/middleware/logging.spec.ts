import axios from 'axios';
import { createLaminar, createLogging, LoggerOptions, Laminar } from '../../src';

let server: Laminar;

const api = axios.create({ baseURL: 'http://localhost:8098' });

describe('createLogging middleware', () => {
  afterEach(() => server.stop());

  it('Should log path and method ', async () => {
    const mockLogger = { log: jest.fn() };
    server = createLaminar({
      port: 8098,
      app: createLogging(mockLogger)(() => {
        throw new Error('Test Error');
      }),
    });
    await server.start();

    await expect(api.get('/test/23')).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 500,
      }),
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'info', 'Request', {
      uri: 'GET /test/23',
      body: '[Stream]',
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'error', 'Error', {
      message: 'Test Error',
      stack: expect.any(String),
    });
  });

  it('Should not call error logger on success', async () => {
    const mockLogger = { log: jest.fn() };
    server = createLaminar({
      port: 8098,
      app: createLogging(mockLogger)(() => 'OK'),
    });
    await server.start();

    await expect(api.get('/test/23')).resolves.toMatchObject({
      status: 200,
      data: 'OK',
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'info', 'Request', {
      uri: 'GET /test/23',
      body: '[Stream]',
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'info', 'Response', {
      body: 'OK',
      status: 200,
    });

    expect(mockLogger.log).toHaveBeenCalledTimes(2);
  });

  it('Should log other things with a custom function', async () => {
    const mockLogger = { log: jest.fn() };
    const errorFormatter: LoggerOptions['error'] = error => {
      return {
        message: `MY ${error.message}`,
      };
    };

    server = createLaminar({
      port: 8098,
      app: createLogging(mockLogger, { error: errorFormatter })(async () => {
        throw new Error('Other Error');
      }),
    });
    await server.start();

    await expect(api.get('/test/23?test=other')).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 500,
      }),
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'info', 'Request', {
      uri: 'GET /test/23?test=other',
      body: '[Stream]',
    });

    expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'error', 'Error', {
      message: 'MY Other Error',
    });
  });
});
