import axios from 'axios';
import { Pool } from 'pg';
import { HttpService, textOk, Middleware, run } from '@ovotech/laminar';
import { PgService, pgMiddleware } from '../src';
import { SimpleQueue, Boss } from './simple-queue';

export interface BossContext<TData> {
  boss: Boss<TData>;
}
export const bossMiddleware =
  <TData>(boss: Boss<TData>): Middleware<BossContext<TData>> =>
  (next) =>
  (ctx) =>
    next({ ...ctx, boss });

describe('Services', () => {
  it('Should start and stop services', async () => {
    jest.setTimeout(10000);
    const port = 8060;
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      describe: () => 'TestLogger',
    };
    const boss = new Boss<number>();
    const pool1 = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
    const pool2 = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });

    const pg1 = new PgService(pool1, 'db1');
    const pg2 = new PgService(pool2, 'db2');

    const withBoss = bossMiddleware(boss);
    const withDatabases = pgMiddleware({ db1: pg1, db2: pg2 });

    const queue = new SimpleQueue<number>(boss, [
      {
        queue: 'one',
        app: async ({ data }) => logger.info(String(data)),
      },
    ]);

    const http = new HttpService({
      port,
      listener: withDatabases(
        withBoss(async ({ boss, query: { data }, db1, db2 }) => {
          logger.info('test');
          await db1.query('SELECT * FROM pg_catalog.pg_tables');
          await db2.query('SELECT * FROM pg_catalog.pg_tables');

          for (const item of data) {
            boss.add('one', Number(item));
          }
          return textOk('OK');
        }),
      ),
    });

    await run(
      {
        initOrder: [
          [boss, pg1, pg2],
          [http, queue],
        ],
        logger,
      },
      async () => {
        await axios.get(`http://localhost:${port}?data[]=1&data[]=2&data[]=3`);
        await axios.get(`http://localhost:${port}?data[]=4`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      },
    );

    expect(logger.info.mock.calls).toEqual([
      ['⏫ Starting Boss'],
      ['⏫ Starting 🛢️ Postgres: db1'],
      ['⏫ Starting 🛢️ Postgres: db2'],
      ['✅ Started Boss'],
      ['✅ Started 🛢️ Postgres: db1'],
      ['✅ Started 🛢️ Postgres: db2'],
      ['⏫ Starting ⛲ Laminar: http://0.0.0.0:8060'],
      ['⏫ Starting Queue: one'],
      ['✅ Started Queue: one'],
      ['✅ Started ⛲ Laminar: http://0.0.0.0:8060'],
      ['test'],
      ['1'],
      ['2'],
      ['3'],
      ['test'],
      ['4'],
      ['⏬ Stopping ⛲ Laminar: http://0.0.0.0:8060'],
      ['⏬ Stopping Queue: one'],
      ['❎ Stopped Queue: one'],
      ['❎ Stopped ⛲ Laminar: http://0.0.0.0:8060'],
      ['⏬ Stopping Boss'],
      ['⏬ Stopping 🛢️ Postgres: db1'],
      ['⏬ Stopping 🛢️ Postgres: db2'],
      ['❎ Stopped Boss'],
      ['❎ Stopped 🛢️ Postgres: db1'],
      ['❎ Stopped 🛢️ Postgres: db2'],
      ['❎ Stop TestLogger'],
    ]);
  });
});
