import type { QueryResult, QueryConfig, QueryResultRow, PoolClient } from 'pg';
import { LoggerLike, LaminarError } from '@ovotech/laminar';

export interface PgClientConfig {
  /**
   * Log values alongside requests themselves
   */
  logValues?: boolean;
  /**
   * Log results of the queries as well
   */
  logResults?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

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
  constructor(public client: PoolClient, public logger?: LoggerLike, public config: PgClientConfig = {}) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: I,
  ): Promise<QueryResult<R>> {
    try {
      const startAt = process.hrtime();
      const level = this.config?.logLevel ?? 'info';
      if (this.logger) {
        this.logger[level]('PG Client: Query', {
          query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
          ...(this.config.logValues
            ? { values: typeof queryTextOrConfig === 'string' ? values : queryTextOrConfig.values }
            : {}),
        });
      }
      const result = await this.client.query(queryTextOrConfig, values);
      if (this.logger) {
        const diff = process.hrtime(startAt);
        const time = diff[0] * 1e3 + diff[1] * 1e-6;

        this.logger[level]('PG Client: Result', {
          milliseconds: time.toFixed(3),
          query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
          ...(this.config.logResults ? { result: result.rows } : {}),
        });
      }
      return result;
    } catch (error) {
      throw new LaminarError(`PG Client: ${error.message}`, {
        query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
        position: error.position,
      });
    }
  }
}
