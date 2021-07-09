import axios from 'axios';
import { HttpService, textOk, Middleware, run } from '@ovotech/laminar';
import { SimpleQueue, Boss } from './simple-queue';
import { WinstonService } from '../src';
import { createLogger, transports } from 'winston';
import { join } from 'path';
import { readFileSync, existsSync, unlinkSync } from 'fs';

export interface BossContext<TData> {
  boss: Boss<TData>;
}
export const bossMiddleware =
  <TData>(boss: Boss<TData>): Middleware<BossContext<TData>> =>
  (next) =>
  (ctx) =>
    next({ ...ctx, boss });

describe('Services', () => {
  jest.setTimeout(10000);
  it('Should start and stop services', async () => {
    const logFile = join(__dirname, 'test.log');
    if (existsSync(logFile)) {
      unlinkSync(logFile);
    }
    const port = 8200;
    const boss = new Boss<number>();
    const winston = createLogger({ transports: new transports.File({ filename: logFile }) });
    const logger = new WinstonService(winston);

    const withBoss = bossMiddleware(boss);

    const queue = new SimpleQueue<number>(boss, [
      {
        queue: 'one',
        app: async ({ data }) => logger.info(String(data)),
      },
    ]);

    const http = new HttpService({
      port,
      listener: withBoss(async ({ boss, query: { data } }) => {
        logger.info('test');

        for (const item of data) {
          boss.add('one', Number(item));
        }
        return textOk('OK');
      }),
    });

    await run(
      {
        initOrder: [boss, [http, queue]],
        logger,
      },
      async () => {
        await axios.get(`http://localhost:${port}?data[]=1&data[]=2&data[]=3`);
        await axios.get(`http://localhost:${port}?data[]=4`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const logContents = readFileSync(logFile, 'utf-8');

    expect(logContents).toMatchSnapshot();
  });
});
