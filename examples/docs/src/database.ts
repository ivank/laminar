import { HttpService, jsonOk, init, openApi, jsonNotFound } from '@laminarjs/laminar';
// << PgContext
import { PgContext } from '@laminarjs/pg';
import { Pool } from 'pg';
// PgContext
import { PgService, pgMiddleware } from '@laminarjs/pg';
import { join } from 'path';

async function main() {
  // << openApi
  const app = await openApi<PgContext>({
    api: join(__dirname, '../schema/user.yaml'),
    paths: {
      '/user': {
        // << query
        post: async ({ db, body }) => {
          const { rows } = await db.query('INSERT INTO db_users (name) VALUES ($1) RETURNING id, name', [body.name]);
          return jsonOk(rows[0]);
        },
        // query
      },
      '/user/{id}': {
        get: async ({ db, path }) => {
          const { rows } = await db.query('SELECT id, name FROM db_users WHERE id = $1', [path.id]);
          return rows[0] ? jsonOk(rows[0]) : jsonNotFound({ message: 'User not found' });
        },
      },
    },
  });
  // openApi

  // << init
  // << PgService
  const pg = new PgService(new Pool({ connectionString: process.env.PG }));
  // PgService

  // << pgMiddleware
  const withDb = pgMiddleware({ db: pg });
  // pgMiddleware

  // << HttpService
  const http = new HttpService({ listener: withDb(app) });
  // HttpService

  init({ initOrder: [pg, http], logger: console });
  // init
}

main();
