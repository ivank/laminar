import { LoggerLike, Service } from '@ovotech/laminar';
import type { Pool, PoolClient } from 'pg';
import { PgClientConfig } from './pg.client';

/**
 * A laminar {@link Service} that calls `end` on the pool when stopping.
 */
export class PgService implements Service {
  constructor(
    public pool: Pool,
    public name: string = 'db',
    public logger?: LoggerLike,
    public config: PgClientConfig = {},
  ) {}

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async start(): Promise<this> {
    return this;
  }

  async stop(): Promise<this> {
    await this.pool.end();
    return this;
  }

  describe(): string {
    return `🛢️ Postgres: ${this.name}`;
  }
}
