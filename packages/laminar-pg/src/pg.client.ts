import type { QueryResult, QueryConfig, QueryResultRow, PoolClient } from 'pg';
import { LoggerLike, LaminarError } from '@ovotech/laminar';

/**
 * A class that wraps a PoolClient, cathing errors and re-throwing them with more diagnostic information.
 *
 * ```typescript
 * const pool = new Pool({ connectionString: '...'});
 * const client = await pool.connect();
 *
 * const pgClient = new PgClient(client, console);
 *
 * await pgClient.query('...');
 * ```
 *
 * @category pg
 */
export class PgClient {
  constructor(public client: PoolClient, public logger?: LoggerLike) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: I,
  ): Promise<QueryResult<R>> {
    try {
      return await this.client.query(queryTextOrConfig, values);
    } catch (error) {
      throw new LaminarError(`PG Client: ${error.message}`, {
        query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
        position: error.position,
      });
    }
  }
}
