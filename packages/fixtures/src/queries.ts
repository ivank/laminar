import { QueryConfig } from 'pg';
import { Entity } from './types';
import { groupByMap, chunk } from './util';

/**
 * Get all the unique column names from all the entites
 * Different entities might have different sets of columns
 */
const toColumnsFromEntites = (entites: Entity[]): string[] => [
  ...new Set(entites.flatMap(({ columns }) => Object.keys(columns))),
];

/**
 * Create insert postgres queries from entites.
 * Chunk size modifies how many rows per insert query
 */
export const toSetupQueries = (chunkSize: number, entities: Entity[]): QueryConfig[] =>
  [...groupByMap((entity) => entity.table, entities).entries()].flatMap(([table, tableEntities]) => {
    const columns = toColumnsFromEntites(tableEntities);
    const serialColumn = tableEntities[0].serialColumn;
    const updateMaxSerial = tableEntities[0].updateMaxSerial;
    const serialIndex = tableEntities[0].serialIndex;

    return chunk(chunkSize, tableEntities)
      .map((entities) => ({
        text: `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES ${entities.map(
          (_, e) => `(${columns.map((_, c, all) => `\$${c + e * all.length + 1}`).join(',')})`,
        )}`,
        values: entities.flatMap((entity) => columns.map((name) => entity.columns[name] ?? null)),
      }))
      .concat(
        updateMaxSerial
          ? {
              text: `SELECT setval(${
                serialIndex ? `'${serialIndex}'` : `pg_get_serial_sequence('${table}', '${serialColumn}')`
              }, coalesce(max("${serialColumn}"), 0)+1 , false) FROM "${table}";`,
              values: [],
            }
          : [],
      );
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
