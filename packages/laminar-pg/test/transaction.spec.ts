import { Pool } from 'pg';
import { PgClient } from '../src';

describe('Transaction', () => {
  it('Should use transaction', async () => {
    const pool = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
    const client = await pool.connect();
    try {
      const pg = new PgClient(client);
      await pg.query("DELETE FROM animals WHERE name LIKE 'transaction-test%'");

      const insertedIds = await pg.transaction(async (tpg) => {
        const result1 = await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test1',
        ]);

        const result2 = await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test2',
        ]);

        return [result1.rows[0].id, result2.rows[0].id];
      });

      const selected = await pg.query<{ id: number; name: string }>(
        'SELECT name, id FROM animals WHERE id = ANY($1) ORDER BY name ASC',
        [insertedIds],
      );

      expect(selected.rows).toEqual([
        { id: expect.any(Number), name: 'transaction-test1' },
        { id: expect.any(Number), name: 'transaction-test2' },
      ]);
    } finally {
      client.release();
      await pool.end();
    }
  });
  it('Should work with nested transactions', async () => {
    const pool = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
    const client = await pool.connect();
    try {
      const pg = new PgClient(client);
      await pg.query("DELETE FROM animals WHERE name LIKE 'transaction-test%'");

      const insertedIds = await pg.transaction(async (tpg) => {
        const result1 = await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test1',
        ]);

        const result2 = await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
          'transaction-test2',
        ]);

        const nested = await tpg.transaction(async (tpg2) => {
          const result3 = await tpg2.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-test3',
          ]);

          const result4 = await tpg2.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-test4',
          ]);
          return [result3.rows[0].id, result4.rows[0].id];
        });

        return [result1.rows[0].id, result2.rows[0].id, ...nested];
      });

      const selected = await pg.query<{ id: number; name: string }>(
        'SELECT name, id FROM animals WHERE id = ANY($1) ORDER BY name ASC',
        [insertedIds],
      );

      expect(selected.rows).toEqual([
        { id: expect.any(Number), name: 'transaction-test1' },
        { id: expect.any(Number), name: 'transaction-test2' },
        { id: expect.any(Number), name: 'transaction-test3' },
        { id: expect.any(Number), name: 'transaction-test4' },
      ]);
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('Should rollback transaction', async () => {
    const pool = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
    const client = await pool.connect();
    try {
      const pg = new PgClient(client);
      await pg.query("DELETE FROM animals WHERE name LIKE 'transaction-rollback%'");

      try {
        await pg.transaction(async (tpg) => {
          await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-rollback1',
          ]);

          await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-rollback2',
          ]);

          throw new Error('Transaction Test Error');
        });
      } catch (error) {
        if (error.message !== 'Transaction Test Error') {
          throw error;
        }
      }

      const selected = await pg.query<{ id: number; name: string }>(
        "SELECT name, id FROM animals WHERE name LIKE 'transaction-rollback%'",
      );

      expect(selected.rows).toEqual([]);
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('Should rollback nested transaction', async () => {
    const pool = new Pool({ connectionString: 'postgres://example-admin:example-pass@localhost:5432/example' });
    const client = await pool.connect();
    try {
      const pg = new PgClient(client);
      await pg.query("DELETE FROM animals WHERE name LIKE 'transaction-rollback%'");

      try {
        await pg.transaction(async (tpg) => {
          await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-rollback1',
          ]);

          await tpg.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
            'transaction-rollback2',
          ]);

          await tpg.transaction(async (tpg2) => {
            await tpg2.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
              'transaction-rollback1',
            ]);

            await tpg2.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
              'transaction-rollback2',
            ]);

            throw new Error('Transaction Test Error');
          });
        });
      } catch (error) {
        if (error.message !== 'Transaction Test Error') {
          throw error;
        }
      }

      const selected = await pg.query<{ id: number; name: string }>(
        "SELECT name, id FROM animals WHERE name LIKE 'transaction-rollback%'",
      );

      expect(selected.rows).toEqual([]);
    } finally {
      client.release();
      await pool.end();
    }
  });
});
