import { join } from 'path';
import { openApiTyped } from './__generated__/comms';
import { HttpListener, jsonNotFound, jsonOk } from '@ovotech/laminar';
import { PgContext } from '@ovotech/laminar-pg';
import { CommsApiContext } from './application';

// << listener
export const httpListener = async (): Promise<HttpListener<PgContext & CommsApiContext>> => {
  return await openApiTyped({
    api: join(__dirname, '../comms.yaml'),

    paths: {
      '/comms': {
        post: async ({ body, db, commsApi }) => {
          const { data } = await commsApi.post('/communication', { email: body.email, template: 'test' });

          const result = await db.query(
            'INSERT INTO comms (comm_id, status) VALUES ($1, $2) RETURNING id, comm_id as "commId", status',
            [data.commId, data.status],
          );
          return jsonOk(result.rows[0]);
        },
      },
      '/comms/{id}': {
        get: async ({ path: { id }, db }) => {
          const result = await db.query('SELECT id, comm_id as "commId", status FROM comms WHERE id = $1', [id]);
          return result.rows[0] ? jsonOk(result.rows[0]) : jsonNotFound({ message: 'Comm Not Found' });
        },
      },
    },
  });
};
// listener
