import { HttpListener, jsonOk, HttpService, init, PgService } from '@ovotech/laminar';

// << middleware
import { Middleware } from '@ovotech/laminar';
import { Pool, PoolClient } from 'pg';

interface DBContext {
  db: PoolClient;
}

const pgPoolMiddleware = (pool: Pool): Middleware<DBContext> => {
  return (next) => async (ctx) => {
    const db = await pool.connect();
    try {
      return await next({ ...ctx, db });
    } finally {
      db.release();
    }
  };
};

// middleware
const pool = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
const withDb = pgPoolMiddleware(pool);

const app: HttpListener<DBContext> = async ({ db }) =>
  jsonOk((await db.query("SELECT * FROM animals WHERE name = 'Cow'")).rows);

const pg = new PgService(pool);
const http = new HttpService({ listener: withDb(app) });

init({ initOrder: [pg, http], logger: console });
