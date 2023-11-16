import { get, init, HttpService, jsonOk, router, HttpListener } from '@laminar/laminar';
import { PgService, pgMiddleware } from '@laminar/pg';
import { Pool } from 'pg';

const pool = new PgService(
  new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example', max: 5 }),
  { initEnumTypeParsers: true },
);
const withDb = pgMiddleware({ db: pool });

const listener: HttpListener = withDb(
  router(
    get('/test', async ({ db }) => {
      const { rows } = await db.query(`SELECT ARRAY['Pending', 'Active']::enum_state[] as "col"`);
      return jsonOk(rows);
    }),
  ),
);

const http = new HttpService({ listener });

// Wait for the pool to be connected, before starting the service
init({ initOrder: [pool, http], logger: console });
