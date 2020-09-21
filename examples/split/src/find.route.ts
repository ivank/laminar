import { AppRoute, jsonOk, jsonNotFound } from '@ovotech/laminar';
import { RequestPg } from './db.middleware';

/**
 * Finding a user requires a PG connection
 */
export type FindRoute = AppRoute<RequestPg>;

export const find: FindRoute = async ({ path, pg }) => {
  const { rows } = await pg.query('SELECT id, name FROM users WHERE id = $1', [path.id]);

  return rows[0]
    ? jsonOk(rows[0])
    : jsonNotFound({ message: `No User With id ${path.id} was found` });
};
