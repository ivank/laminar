import axios from 'axios';
import { createLaminar, createLogging, LoggerOptions, Laminar, response } from '../../src';
import { defaultOptions } from '../../src/middleware/logging';
import { Readable } from 'stream';

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

describe('createLogging middleware functions', () => {
  it.each`
    title                   | response                                               | expected
    ${'Buffer response'}    | ${response({ body: Buffer.from('123') })}              | ${{ body: '[Buffer]', status: 200 }}
    ${'Buffer with status'} | ${response({ body: Buffer.from('123'), status: 400 })} | ${{ body: '[Buffer]', status: 400 }}
    ${'Only Buffer'}        | ${Buffer.from('123')}                                  | ${{ body: '[Buffer]', status: 200 }}
    ${'Only Readable'}      | ${new Readable()}                                      | ${{ body: '[Readable]', status: 200 }}
    ${'Readable response'}  | ${response({ body: new Readable() })}                  | ${{ body: '[Readable]', status: 200 }}
    ${'Readable status'}    | ${response({ body: new Readable(), status: 400 })}     | ${{ body: '[Readable]', status: 400 }}
    ${'Object response'}    | ${response({ body: { test: true }, status: 400 })}     | ${{ body: { test: true }, status: 400 }}
    ${'Only Object'}        | ${{ test: true }}                                      | ${{ body: { test: true }, status: 200 }}
  `('Should process response $title', async ({ response, expected }) => {
    expect(defaultOptions.response && defaultOptions.response(response)).toEqual(expected);
  });
});
