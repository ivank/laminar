import { Service } from '@ovotech/laminar';
import { Pool, PoolClient, types } from 'pg';
import { PgClientConfig } from './pg.client';

/**
 * A laminar {@link Service} that calls `end` on the pool when stopping.
 */
export class PgService implements Service {
  constructor(
    public pool: Pool,
    public config: PgClientConfig = {},
  ) {}

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async initEnumTypeParsing(): Promise<this> {
    const { rows } = await this.pool.query(`
        SELECT pg_type.typarray
        FROM pg_catalog.pg_type JOIN pg_catalog.pg_enum ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typcategory = 'E'
        GROUP BY pg_type.typarray
      `);

    const arrayTextParser = types.getTypeParser(1009);
    for (const { typarray } of rows) {
      types.setTypeParser(typarray, arrayTextParser);
    }

    return this;
  }

  async start(): Promise<this> {
    if (this.config.initEnumTypeParsers) {
      await this.initEnumTypeParsing();
    }
    return this;
  }

  async stop(): Promise<this> {
    await this.pool.end();
    return this;
  }

  describe(): string {
    return `🛢️ Postgres: ${this.config.name ?? 'db'}`;
  }
}
