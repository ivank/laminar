import { loggerMiddleware, HttpService, init, LoggerLike } from '@ovotech/laminar';
import { pgMiddleware, PgService } from '@ovotech/laminar-pg';
import { Pool } from 'pg';
import { routes } from './routes';

const main = async () => {
  if (process.env.PG === undefined) {
    throw new Error('Need PG env variable');
  }

  if (process.env.PORT === undefined) {
    throw new Error('Need PORT env variable');
  }

  const pg = new PgService(new Pool({ connectionString: process.env.PG }));
  const logger: LoggerLike = console;
  const withLogger = loggerMiddleware(logger);
  const withDb = pgMiddleware({ db: pg });

  const listener = withLogger(withDb(routes));

  const http = new HttpService({ listener, port: Number(process.env.PORT) });
  await init({ initOrder: [pg, http], logger: console });
};

main();
