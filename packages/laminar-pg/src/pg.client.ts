import type { QueryResult, QueryConfig, QueryResultRow, PoolClient } from 'pg';
import { LoggerLike, LaminarError } from '@ovotech/laminar';

export interface PgClientConfig {
  /**
   * Specify if the client is part of a transaction.
   */
  transaction?: boolean;
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

  /**
   * Wrap the operations in a transaction, commit it when the Promise is resolved and rollback if there is an exception.
   * Supports nested transactions, but only the outermost transaction is used.
   * The result of a transaction is the return of its "operations" function.
   *
   * ```typescript
   * const result = await db.transaction(await (tr) => {
   *   await tr.query('...');
   *   await tr.query('...');
   *   return 'value';
   * });
   * ```
   */
  async transaction<T>(operation: (db: PgClient) => Promise<T>): Promise<T> {
    if (!this.config.transaction) {
      await this.client.query('BEGIN');
    }
    try {
      const result = await operation(new PgClient(this.client, this.logger, { ...this.config, transaction: true }));
      if (!this.config.transaction) {
        await this.client.query('COMMIT');
      }
      return result;
    } catch (error) {
      if (!this.config.transaction) {
        await this.client.query('ROLLBACK');
      }
      throw error;
    }
  }
}
