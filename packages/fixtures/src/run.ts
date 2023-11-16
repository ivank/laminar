import { ClientBase, QueryConfig, DatabaseError } from 'pg';
import { generate } from './fixtures';
import { toSetupQueries, toTeardownQueries } from './queries';
import { Entity, Fixture, GenerateId } from './types';

/**
 * Configuration for running fixtures
 */
export interface Config {
  /**
   * Database connection, retrieved from `pg`'s `new Client()` or `new Pool()`
   */
  db: ClientBase;
  /**
   * An array of fictures. Use `[fixture()]` or `multiFixture()`
   */
  fixtures?: Fixture[];
  /**
   * An array of entities. You can generate your entities first, using fixtures and the pass them to `setUp` / `tearDown`
   */
  entities?: Entity[];
  /**
   * The size of the queries to use for inserting / deleting data.
   * A value of 100 will mean that inserts for each table are batched 100 at a time.
   * Defaults to 500.
   */
  chunkSize?: number;
  /**
   * Function to be used for generating new ids, based on the previous ID.
   */
  generateId?: GenerateId;
}

const queryWithError = async (db: ClientBase, queries: QueryConfig[]): Promise<void> => {
  try {
    await db.query('BEGIN');
    for (const query of queries) {
      try {
        await db.query(query);
      } catch (error) {
        const values = JSON.stringify(query.values, undefined, 2);
        if (error instanceof DatabaseError) {
          throw new Error(`Problem in query: ${error.message}: ${error.position}\n${query.text}\n ${values}`);
        } else {
          throw error;
        }
      }
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

/**
 * Run fixtures to create the entities on a database connection.
 *
 * ```typescript
 * import { fixture, id, setUp } from '@laminarjs/fixtures';
 * import { Client } from 'pg';
 *
 * const myFixture = fixture('mytable', { id, name: 'First' });
 *
 * const db = new Client({ ... });
 * await db.connect();
 * await setUp({ db, fixtures: [myFixture] });
 * ```
 *
 * Or you can pre-generate your fixtures and pass them to the `setUp` (and `tearDown`)
 *
 * ```typescript
 * import { fixture, id, setUp, generate } from '@laminarjs/fixtures';
 * import { Client } from 'pg';
 *
 * const myFixture = fixture('mytable', { id, name: 'First' });
 * const entities = generate([myFixture]);
 *
 * const db = new Client({ ... });
 * await db.connect();
 * await setUp({ db, entities: entities });
 * ```
 */
export const setUp = async ({ db, fixtures, entities, chunkSize = 500, generateId }: Config): Promise<Entity[]> => {
  const generatedEntities = fixtures ? generate(fixtures, { generateId }) : entities ?? [];
  const queries = toSetupQueries(chunkSize, generatedEntities);
  await queryWithError(db, queries);
  return generatedEntities;
};

/**
 * Delete the entities created on database connections
 *
 * ```typescript
 * import { fixture, id, setUp, generate } from '@laminarjs/fixtures';
 * import { Client } from 'pg';
 *
 * const myFixture = fixture('mytable', { id, name: 'First' });
 *
 * const db = new Client({ ... });
 * await db.connect();
 * await setUp({ db, fixtures: [myFixture] });
 * // Do your work
 * await tearDown({ db, fixtures: [myFixture] });
 *
 * // Or you can get the entities from setup directly
 * ===================================================
 *
 * const entities = await setUp({ db, fixtures: [myFixture] });
 * // Do your work
 * await tearDown({ db, entities });
 * ```
 */
export const tearDown = async ({ db, fixtures, entities, chunkSize = 500, generateId }: Config): Promise<Entity[]> => {
  const generatedEntities = fixtures ? generate(fixtures, { generateId }) : entities ?? [];
  const queries = toTeardownQueries(chunkSize, generatedEntities);
  await queryWithError(db, queries);
  return generatedEntities;
};
