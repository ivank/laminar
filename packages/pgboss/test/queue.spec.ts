import axios from 'axios';
import { queueMiddleware, QueueService, QueueWorkerService, QueueWorkersService } from '../src';
import { HttpService, loggerMiddleware, textOk, run, router, get } from '@laminarjs/laminar';
import PgBoss from 'pg-boss';

describe('Integration', () => {
  it('Should work through a queue with a single worker', async () => {
    const port = 9060;
    const logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    const logging = loggerMiddleware(logger);
    const workerResponse = jest
      .fn()
      .mockResolvedValueOnce('Test Completed')
      .mockRejectedValueOnce(new Error('Test Crashed'))
      .mockResolvedValueOnce('Test Completed')
      .mockRejectedValueOnce(new Error('Test Crashed'))
      .mockResolvedValueOnce('Test Completed')
      .mockResolvedValueOnce('Test Completed')
      .mockResolvedValueOnce('Test Completed')
      .mockResolvedValueOnce('Test Completed');

    const queue = new QueueService(
      new PgBoss({
        connectionString: 'postgres://example-admin:example-pass@localhost:5432/example',
        noScheduling: true,
        noSupervisor: true,
      }),
      { test: { retryLimit: 1, retryDelay: 1 } },
    );
    const withQueue = queueMiddleware(queue);

    const worker = new QueueWorkerService<object>(queue, {
      name: 'test',
      worker: logging(async ({ data, logger }) => {
        const result = await workerResponse();
        logger.info(data, result);
      }),
      options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
    });

    const http = new HttpService({
      port,
      listener: withQueue(
        logging(
          router(
            get('/send', async ({ logger, queue, query: { data } }) => {
              logger.info('test');
              for (const item of data) {
                await queue.send({ name: 'test', data: item });
              }
              return textOk('OK');
            }),
            get('/insert', async ({ logger, queue, query: { data } }) => {
              logger.info('test multiple');
              await queue.insert(data.map((item: unknown) => ({ name: 'test', data: Number(item) })));
              return textOk('OK');
            }),
          ),
        ),
      ),
    });

    await run({ initOrder: [queue, [http, worker]] }, async () => {
      await axios.get(`http://localhost:${port}/send?data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}/send?data[]=4`);
      await axios.get(`http://localhost:${port}/insert?data[]=5&data[]=6`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    expect(logger.info).toHaveBeenCalledWith(1, 'Test Completed');
    expect(logger.info).toHaveBeenCalledWith(2, 'Test Completed');
    expect(logger.info).toHaveBeenCalledWith(3, 'Test Completed');
    expect(logger.info).toHaveBeenCalledWith(4, 'Test Completed');
    expect(logger.info).toHaveBeenCalledWith(5, 'Test Completed');
    expect(logger.info).toHaveBeenCalledWith(6, 'Test Completed');

    expect(logger.info).toHaveBeenCalledTimes(9);
  });

  it('Should work with multiple workers', async () => {
    const port = 9061;
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const logging = loggerMiddleware(logger);

    const queue = new QueueService(
      new PgBoss({
        connectionString: 'postgres://example-admin:example-pass@localhost:5432/example',
        noScheduling: true,
        noSupervisor: true,
      }),
    );
    const withQueue = queueMiddleware(queue);

    const worker = new QueueWorkersService(queue, [
      {
        name: 'test-1',
        worker: logging(async ({ data, logger }) => {
          logger.info('test-1', { data });
        }),
        options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
      },
      {
        name: 'test-2',
        worker: logging(async ({ data, logger }) => {
          logger.info('test-2', { data });
        }),
        options: { newJobCheckInterval: 100, teamConcurrency: 1, teamSize: 1 },
      },
    ]);

    const http = new HttpService({
      port,
      listener: withQueue(
        logging(async ({ logger, queue, query: { name, data } }) => {
          logger.info('test');
          for (const item of data) {
            queue.send({ name, data: item });
          }
          return textOk('OK');
        }),
      ),
    });

    await run({ initOrder: [queue, [http, worker]] }, async () => {
      await axios.get(`http://localhost:${port}?name=test-1&data[]=1&data[]=2&data[]=3`);
      await axios.get(`http://localhost:${port}?name=test-2&data[]=4`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    });

    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 1 });
    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 2 });
    expect(logger.info).toHaveBeenCalledWith('test-1', { data: 3 });
    expect(logger.info).toHaveBeenCalledWith('test-2', { data: 4 });
  });
});
