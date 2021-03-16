import type { QueryResult, QueryConfig, QueryResultRow, PoolClient } from 'pg';
import { LoggerLike } from '../logger';
import { PgError } from './pg-error';

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
      throw new PgError(
        `PG Client: ${error.message}`,
        typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
        error.position,
      );
    }
  }
}
