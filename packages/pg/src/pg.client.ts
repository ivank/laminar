import { QueryResult, QueryConfig, QueryResultRow, PoolClient, DatabaseError } from 'pg';
import { LoggerLike, LaminarError } from '@laminarjs/laminar';

export interface PgClientConfig {
  name?: string;

  logger?: LoggerLike;

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
  initEnumTypeParsers?: boolean;
}

interface TransactionOptions {
  isolationLevel?: 'serializable' | 'repeatable read' | 'read committed' | 'read uncommitted';
  write?: boolean;
  deferrable?: boolean;
}

const toTransactionModes = (options: TransactionOptions): string =>
  ['BEGIN']
    .concat('isolationLevel' in options || 'write' in options || 'deferrable' in options ? ['TRANSACTION'] : [])
    .concat(options.isolationLevel ? ['ISOLATION LEVEL', options.isolationLevel] : [])
    .concat(options.write === undefined ? [] : options.write === true ? ['READ WRITE'] : ['READ ONLY'])
    .concat(options.deferrable === undefined ? [] : options.deferrable === true ? ['DEFERRABLE'] : ['NOT DEFERRABLE'])
    .join(' ');

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
  constructor(
    public client: PoolClient,
    public config: PgClientConfig = {},
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: I,
  ): Promise<QueryResult<R>> {
    try {
      const startAt = process.hrtime();
      const level = this.config?.logLevel ?? 'info';
      if (this.config.logger) {
        this.config.logger[level]('PG Client: Query', {
          query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
          ...(this.config.logValues
            ? { values: typeof queryTextOrConfig === 'string' ? values : queryTextOrConfig.values }
            : {}),
        });
      }
      const result = await this.client.query(queryTextOrConfig, values);
      if (this.config.logger) {
        const diff = process.hrtime(startAt);
        const time = diff[0] * 1e3 + diff[1] * 1e-6;

        this.config.logger[level]('PG Client: Result', {
          milliseconds: time.toFixed(3),
          query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
          ...(this.config.logResults ? { result: result.rows } : {}),
        });
      }
      return result;
    } catch (error) {
      throw new LaminarError(`PG Client: ${error instanceof Error ? error.message : String(error)}`, {
        query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
        position: error instanceof DatabaseError ? error.position : undefined,
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
  async transaction<T>(options: TransactionOptions, operation: (db: PgClient) => Promise<T>): Promise<T>;
  async transaction<T>(operation: (db: PgClient) => Promise<T>): Promise<T>;
  async transaction<T>(
    ...args:
      | [options: TransactionOptions, operation: (db: PgClient) => Promise<T>]
      | [operation: (db: PgClient) => Promise<T>]
  ): Promise<T> {
    const [options, operation] = args.length === 1 ? [{}, ...args] : args;
    if (!this.config.transaction) {
      await this.client.query(toTransactionModes(options));
    }
    try {
      const result = await operation(new PgClient(this.client, { ...this.config, transaction: true }));
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
