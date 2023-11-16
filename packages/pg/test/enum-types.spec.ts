import axios from 'axios';
import { HttpService, LoggerLike, Middleware, run, router, jsonOk, get } from '@laminar/laminar';
import { pgMiddleware, PgService } from '../src';
import { Pool } from 'pg';

export interface LoggerContext {
  logger: LoggerLike;
}

export const loggerMiddleware =
  (logger: LoggerLike): Middleware<LoggerContext> =>
  (next) =>
  (ctx) =>
    next({ ...ctx, logger });

describe('Integration', () => {
  jest.setTimeout(10000);
  it('Should start and stop services', async () => {
    const port = 10060;
    const loggerMock = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const withLogger = loggerMiddleware(loggerMock);

    const pool = new PgService(
      new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example', max: 5 }),
      { initEnumTypeParsers: true },
    );
    const withDb = pgMiddleware({ db: pool });

    const http = new HttpService({
      port,
      listener: withLogger(
        withDb(
          router(
            get('/types', async ({ db }) =>
              jsonOk((await db.query(`SELECT ARRAY['Pending', 'Active']::enum_state[] as "col"`)).rows),
            ),
          ),
        ),
      ),
    });

    await run({ initOrder: [pool, http] }, async () => {
      expect((await axios.get(`http://localhost:${port}/types`)).data).toEqual([{ col: ['Pending', 'Active'] }]);
    });
  });
});
