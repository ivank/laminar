import { Service } from '@ovotech/laminar';
import type { Pool, PoolClient } from 'pg';

/**
 * A laminar {@link Service} that calls `end` on the pool when stopping.
 */
export class PgService implements Service {
  constructor(public pool: Pool, public name: string = 'db') {}

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
