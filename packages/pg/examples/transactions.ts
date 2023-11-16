import { get, init, HttpService, jsonOk, router, HttpListener } from '@laminar/laminar';
import { PgService, pgMiddleware } from '@laminar/pg';
import { Pool } from 'pg';

const pool = new PgService(
  new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example', max: 5 }),
);
const withDb = pgMiddleware({ db: pool });

const listener: HttpListener = withDb(
  router(
    get('/test', async ({ db }) => {
      await db.query("DELETE FROM animals WHERE name LIKE 'transaction-test%'");

      // << transactions
      const insertedIds = await db.transaction(async (t) => {
        const result1 = await t.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test1',
        ]);

        const result2 = await t.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test2',
        ]);

        return [result1.rows[0].id, result2.rows[0].id];
      });

      const { rows } = await db.query<{ id: number; name: string }>(
        'SELECT name, id FROM animals WHERE id = ANY($1) ORDER BY name ASC',
        [insertedIds],
      );
      // transactions
      return jsonOk(rows);
    }),
  ),
);

const http = new HttpService({ listener });

// Wait for the pool to be connected, before starting the service
init({ initOrder: [pool, http], logger: console });
