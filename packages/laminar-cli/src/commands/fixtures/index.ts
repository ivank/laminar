import { green, red, yellow } from 'chalk';
import commander from 'commander';
import fs from 'fs';
import { Enum, Table, toTypeScript } from './convert';
import { dirname } from 'path';
import { Logger } from '../../types';
import { Client } from 'pg';

const enumsSql = `
  SELECT
    pg_type.typname as "name",
    JSONB_AGG(pg_enum.enumlabel) as "enum"
  FROM pg_catalog.pg_type
  JOIN pg_catalog.pg_enum ON pg_enum.enumtypid = pg_type.oid
  LEFT JOIN information_schema.columns ON columns.data_type = 'USER-DEFINED' AND columns.udt_name = pg_catalog.pg_type.typname
  WHERE pg_type.typcategory = 'E'
  GROUP BY pg_type.typname, pg_type.typcategory, pg_type.oid
  ORDER BY pg_type.typname ASC
`;

const columnsSql = `
  SELECT
    table_schema AS "schema",
    table_name AS "table",
    column_name AS "column",
    is_nullable AS "isNullable",
    column_default AS "columnDefault",
    udt_name AS "recordName",
    data_type AS "dataType"
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_schema ASC, table_name ASC, ordinal_position ASC
`;

interface Column {
  schema: string;
  table: string;
  column: string;
  isNullable: 'YES' | 'NO';
  columnDefault: string | null;
  recordName: string;
  dataType: string;
}

export const fixturesCommand = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('fixtures')
    .description('Load pg tables and generate @ovotech/laminar-fixtures types from them')
    .argument('connection-string', 'Connection string uri for the postgres database')
    .option<string[]>(
      '-s, --table <table-name>',
      'Only load specified tables. Can be used more than once',
      (table, tables) => [...tables, table],
      [],
    )
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .option('-x, --suffix <table-suffix>', 'Add a custom suffix to all table names')
    .option('-c, --title-case', 'Convert table name to title case (test_name -> TestName)', false)
    .action(async (connectionString, { suffix, table, output, titleCase }) => {
      const client = new Client({ connectionString });
      try {
        await client.connect();

        const [{ rows: columns }, { rows: enums }] = await Promise.all([
          client.query<Column>(columnsSql),
          client.query<Enum>(enumsSql),
        ]);

        const tables = columns.reduce<Record<string, Table>>(
          (current, column) => ({
            ...current,
            [column.table]: {
              name: column.table,
              columns: [
                ...(current[column.table]?.columns ?? []),
                {
                  name: column.column,
                  isOptional:
                    column.isNullable === 'YES' ||
                    (column.columnDefault !== null && !column.columnDefault.match(/nextval\('(.*)_seq'::regclass\)/)),
                  type: column.dataType === 'USER-DEFINED' ? column.recordName : column.dataType,
                },
              ],
            },
          }),
          {},
        );

        const result = toTypeScript({
          tables: Object.values(tables).filter((item) => !table?.length || table.includes(item.name)),
          enums,
          suffix,
          titleCase,
        });

        if (output) {
          fs.mkdirSync(dirname(output), { recursive: true });
          logger.info(`Fixture type data from ${green(connectionString)} -> ${yellow(output)} laminar fixture types`);
          fs.writeFileSync(output, result);
        } else {
          process.stdout.write(result);
        }
      } catch (error) {
        logger.error(red(error.message));
      } finally {
        await client.end();
      }
    });
