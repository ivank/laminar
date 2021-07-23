import { QueryConfig } from 'pg';
import { Entity } from './types';
import { groupByMap, chunk } from './util';

/**
 * Create insert postgres queries from entites.
 * Chunk size modifies how many rows per insert query
 */
export const toSetupQueries = (chunkSize: number, entities: Entity[]): QueryConfig[] =>
  [...groupByMap((entity) => entity.table, entities).entries()].flatMap(([table, tableEntities]) => {
    const columns = Object.keys(tableEntities[0].columns);

    return chunk(chunkSize, tableEntities).map((entities) => ({
      text: `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES ${entities.map(
        (_, e) => `(${columns.map((_, c, all) => `\$${c + e * all.length + 1}`).join(',')})`,
      )}`,
      values: entities.flatMap((entity) => columns.map((name) => entity.columns[name])),
    }));
  });

/**
 * Create delete postgres queries from entites.
 * Chunk size modifies how many rows per delete query
 */
export const toTeardownQueries = (chunkSize: number, entities: Entity[]): QueryConfig[] =>
  [...groupByMap((entity) => entity.table, entities)].reverse().flatMap(([table, tableEntities]) =>
    chunk(chunkSize, tableEntities).map((entities) => ({
      text: `DELETE FROM "${table}" WHERE id IN (${entities.map((_, index) => `\$${index + 1}`).join(', ')})`,
      values: entities.map((entity) => entity.columns['id']),
    })),
  );
