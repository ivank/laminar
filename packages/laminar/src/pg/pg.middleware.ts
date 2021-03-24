import { Middleware } from '../types';
import { PgService } from './pg.service';
import { PgClient } from './pg.client';

export type PgMiddlewareConfig = Record<string, PgService>;

export type PgContext<TConfig extends PgMiddlewareConfig = { db: PgService }> = Record<keyof TConfig, PgClient>;

/**
 * A middleware that handles DB access.
 * Each request gets its own pool client,
 * so there is isolation between requests and their transactions.
 *
 * We are also able to handle exceptions gracefully,
 * releasing the client from the pool in an event of one.
 *
 * Can be used with any resolver function, like http listener or queue worker.
 *
 * Supports multiple pools, and would create connections to all of them simultaneously.
 *
 * @category pg
 */
export function pgMiddleware(config: { db: PgService }): Middleware<PgContext>;
export function pgMiddleware<TConfig extends PgMiddlewareConfig>(config: TConfig): Middleware<PgContext<TConfig>>;
export function pgMiddleware<TConfig extends PgMiddlewareConfig>(config: TConfig): Middleware<PgContext<TConfig>> {
  return (next) => async (ctx) => {
    // Each request gets its own client connection.
    const pgContext = (
      await Promise.all(
        Object.entries(config).map(
          async ([key, pool]) => [key, new PgClient(await pool.connect())] as [keyof TConfig, PgClient],
        ),
      )
    ).reduce((all, [key, client]) => ({ ...all, [key]: client }), {} as PgContext<TConfig>);

    try {
      return await next({ ...ctx, ...pgContext });
    } finally {
      // put the client back into the pool even in an event of an exception.
      Object.values(pgContext).map((db) => db.client.release());
    }
  };
}
