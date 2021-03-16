import { Middleware } from '../types';
import { PgService } from './pg.service';
import { PgClient } from './pg.client';

export interface PgContext {
  db: PgClient;
}

/**
 * A middleware that handles DB access.
 * Each request gets its own pool client,
 * so there is isolation between requests and their transactions.
 *
 * We are also able to handle exceptions gracefully,
 * releasing the client from the pool in an event of one.
 */
export const pgMiddleware = (pool: PgService): Middleware<PgContext> => {
  return (next) => async (req) => {
    // Each request gets its own client connection.
    const db = new PgClient(await pool.connect());
    try {
      return await next({ ...req, db });
    } finally {
      // put the client back into the pool even in an event of an exception.
      db.client.release();
    }
  };
};
