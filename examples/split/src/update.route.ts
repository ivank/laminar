import { AppRoute, LoggerContext, jsonOk } from '@laminarjs/laminar';
import { PgContext } from '@laminarjs/pg';

/**
 * Updating a user requires a PG connection and logging capablilities
 */
export type UpdateRoute = AppRoute<PgContext & LoggerContext>;

export const update: UpdateRoute = async ({ path, db, body, logger }) => {
  await db.query('UPDATE users SET name = $1 WHERE id = $2', [body.name, path.id]);
  logger.info('User Updated');

  return jsonOk({ message: 'User Updated' });
};
