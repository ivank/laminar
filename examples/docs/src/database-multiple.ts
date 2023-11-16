import { HttpService, jsonOk, init, openApi, jsonNotFound } from '@laminarjs/laminar';
import { PgContext, PgService, pgMiddleware } from '@laminarjs/pg';
import { Pool } from 'pg';
import { join } from 'path';

async function main() {
  // << openApi
  const app = await openApi<PgContext<{ db: PgService; backup: PgService }>>({
    api: join(__dirname, '../schema/user.yaml'),
    paths: {
      '/user': {
        post: async ({ db, backup, body: { name } }) => {
          const { rows } = await db.query('INSERT INTO db_users (name) VALUES ($1) RETURNING id, name', [name]);
          await backup.query('INSERT INTO db_users2 (name) VALUES ($1) RETURNING id, name', [name]);
          return jsonOk(rows[0]);
        },
      },
      '/user/{id}': {
        get: async ({ db, backup, path }) => {
          const result = await db.query('SELECT id, name FROM db_users WHERE id = $1', [path.id]);
          const backupResult = await backup.query('SELECT id, name FROM db_users2 WHERE id = $1', [path.id]);
          const user = result.rows[0] ?? backupResult.rows[0];
          return user ? jsonOk(user) : jsonNotFound({ message: 'User not found' });
        },
      },
    },
  });
  // openApi

  // << init

  // << pgMiddleware
  const pg = new PgService(new Pool({ connectionString: process.env.PG }));
  const pgBackup = new PgService(new Pool({ connectionString: process.env.PG_BACKUP }));

  const withDb = pgMiddleware({ db: pg, backup: pgBackup });

  const http = new HttpService({ listener: withDb(app) });

  init({ initOrder: [[pg, pgBackup], http], logger: console });
  // pgMiddleware
}

main();
