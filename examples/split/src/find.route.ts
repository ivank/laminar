import { AppRoute, jsonOk, jsonNotFound, optional } from '@ovotech/laminar';
import { RequestPg } from './db.middleware';

/**
 * Finding a user requires a PG connection
 */
export type FindRoute = AppRoute<RequestPg>;

export const find: FindRoute = async ({ path, pg }) => {
  const sql = 'SELECT id, name, created_at as "createdAt" FROM users WHERE id = $1';
  const { rows } = await pg.query(sql, [path.id]);

  return optional(jsonOk, rows[0]) ?? jsonNotFound({ message: `No User With id ${path.id} was found` });
};
