import { format } from 'util';
import {
  BuildColumns,
  ColumnBuilder,
  Context,
  Entity,
  EntityColumns,
  ExtractFixtureValue,
  Fixture,
  FixtureColumn,
  GenerateId,
  RelColumnBuilder,
} from './types';
import { mapValues } from './util';

// Helpers
// -------------------------

const isColumnBuilder = (value: unknown): value is ColumnBuilder =>
  typeof value === 'object' && value !== null && ColumnBuilder in value;
const isRelColumnBuilder = (value: unknown): value is RelColumnBuilder => isColumnBuilder(value) && 'fixture' in value;

const toColumnBuilder = <TFixtureColumn extends FixtureColumn>(
  value: TFixtureColumn,
): ColumnBuilder<ExtractFixtureValue<TFixtureColumn>> =>
  (isColumnBuilder(value)
    ? value
    : typeof value === 'function'
      ? { [ColumnBuilder]: (id, context) => ({ value: value(id, context), context }) }
      : { [ColumnBuilder]: (_, context) => ({ value, context }) }) as ColumnBuilder<
    ExtractFixtureValue<TFixtureColumn>
  >;

const entitiesWithContext = (initialContext: Context, fixtures: Fixture[]): Context =>
  fixtures.reduce((current, fixture) => {
    const generateId = current?.generateId ?? generateIdSequnce;
    const id = generateId(current?.idMap?.[fixture.table], fixture.table);
    const idContext = {
      ...current,
      fixtureIds: (current.fixtureIds ?? new Map()).set(fixture, id),
      idMap: { ...current.idMap, [fixture.table]: id },
    };

    const initColumns: { columns: EntityColumns; context: Context } = { columns: {}, context: idContext };
    const { columns, context: entityContext } = Object.entries(fixture.columns).reduce(
      ({ columns, context }, [name, column]) => {
        const { value, context: columnContext } = isRelColumnBuilder(column)
          ? column[ColumnBuilder](id, context, column.fixture)
          : toColumnBuilder(column)[ColumnBuilder](id, context);
        return { columns: { ...columns, [name]: value }, context: columnContext };
      },
      initColumns,
    );
    return {
      ...entityContext,
      entities: (entityContext?.entities ?? new Map()).set(fixture, {
        table: fixture.table,
        columns,
        serialColumn: fixture.serialColumn,
        updateMaxSerial: fixture.updateMaxSerial,
        serialIndex: fixture.serialIndex,
      }),
    };
  }, initialContext);

// Columns
// -------------------------

/**
 * Directly return the current entity id. Useful for table serial primary keys
 *
 * ```typescript
 * import { fixture, id, generate } from '@laminar/fixtures';
 * const myFixture = fixture('mytable', { id });
 *
 * console.log(generate([myFixture]));
 * // would output
 * [{ table: 'mytable', columns: { id: 1 } }]
 * ```
 */
export const id: ColumnBuilder<number> = { [ColumnBuilder]: (id, context) => ({ value: id, context }) };

/**
 * Generate a column value using the current entity id.
 *
 * ```typescript
 * import { fixture, template, generate } from '@laminar/fixtures';
 * const myFixture = fixture('mytable', { name: template('My column %s') });
 *
 * console.log(generate([myFixture]));
 * // would output
 * [{ table: 'mytable', columns: { name: 'My column 1' }}]
 * ```
 */
export const template = (value: string): ColumnBuilder<string> => ({
  [ColumnBuilder]: (id, context) => ({ value: format(value, id), context }),
});

/**
 * Get a column from another fixture. We create a map of dependencies,
 * so that if you link another fixture, it will create it first,
 * and then use its columns to get the value.
 *
 * ```typescript
 * import { fixture, id, rel, generate } from '@laminar/fixtures';
 * const parent = fixture('parents', { id });
 * const child = fixture('children', {
 *   id,
 *   parent_id: rel(parent, 'id');
 * });
 *
 * console.log(generate([child]));
 * // would output
 * [
 *   { table: 'parents', columns: { id: 1 } },
 *   { table: 'children', columns: { id: 1, parent_id: 1 } },
 * ]
 * ```
 */
export const rel = <TFixture extends Fixture, TColumn extends keyof TFixture['columns']>(
  fixture: TFixture,
  column: TColumn,
): RelColumnBuilder<ExtractFixtureValue<TFixture['columns'][TColumn]>> => ({
  fixture,
  [ColumnBuilder]: (_, context, currentFixture) => {
    const entity = context?.entities?.get(currentFixture);
    if (entity) {
      return { value: entity.columns[column as string], context };
    } else if (column === 'id' && context.fixtureIds?.has(currentFixture)) {
      return { value: context.fixtureIds.get(currentFixture), context };
    } else {
      const entityContext = entitiesWithContext(context, [currentFixture]);
      return {
        value: (entityContext?.entities ?? new Map()).get(currentFixture)?.columns[column],
        context: entityContext,
      };
    }
  },
});

/**
 * Switch between multiple variants of a column, depending on the id.
 *
 * ```typescript
 * import { fixture, alternate, multiFixture, generate } from '@laminar/fixtures';
 * const myFixture = fixture('mytable', { type: alternate('Generation', 'Export') });
 *
 * console.log(generate(multiFixture(2, myFixture)));
 * // would output
 * [
 *   { table: 'mytable', columns: { type: 'Generation' } },
 *   { table: 'mytable', columns: { type: 'Export' } },
 * ]
 * ```
 */
export const alternate = <TFixtureColumn extends FixtureColumn>(
  ...items: Array<TFixtureColumn>
): ColumnBuilder<ExtractFixtureValue<TFixtureColumn>> => ({
  [ColumnBuilder]: (id, context) => toColumnBuilder(items[(id - 1) % items.length])[ColumnBuilder](id, context),
});

// Fixtures
// -------------------------

/**
 * A wrapper to create a fixture that can be used by {@link setUp}, {@link tearDown} and {@link generate} functions
 *
 * ```typescript
 * import { fixture, setUp, id } from '@laminar/fixtures';
 * import { Client } from 'pg';
 *
 * const myFixture = fixture('mytable', { id });
 *
 * const db = new Client({ ... });
 * await db.connect();
 * await setUp(db,[myFixture]);
 * // would output
 * [
 *   { table: 'mytable', columns: { type: 'Generation' } },
 *   { table: 'mytable', columns: { type: 'Export' } },
 * ]
 * ```
 */
export const fixture = <TFixture extends Fixture>(
  table: string,
  columns: TFixture['columns'],
  {
    serialColumn = 'id',
    updateMaxSerial = true,
    serialIndex,
  }: { serialColumn?: string; updateMaxSerial?: boolean; serialIndex?: string } = {},
): TFixture => ({ table, columns, serialColumn, updateMaxSerial, serialIndex }) as TFixture;

/**
 * Create a copy of the fixture, with optionally some columns altered.
 * Pass the `deep: true` option to make sure all the referenced fixtures are also cloned
 *
 * ```typescript
 * import { fixture, cloneFixture, id, setUp } from '@laminar/fixtures';
 * import { Client } from 'pg';
 *
 * const first = fixture('mytable', { id, name: 'First' });
 * const second = cloneFixture(first, { columns: { name: 'Second' } });
 *
 * const db = new Client({ ... });
 * await db.connect();
 * await setUp(db,[first, second]);
 * // would output
 * [
 *   { table: 'mytable', columns: { id: 1, type: 'First' } },
 *   { table: 'mytable', columns: { id: 2, type: 'Second' } },
 * ]
 * ```
 * */
export const cloneFixture = <TFixture extends Fixture>(
  fixture: TFixture,
  {
    columns = {},
    deep = false,
  }: {
    /**
     * If true, all the referenced (with rel) fixtures will be cloned recursively
     */
    deep?: boolean;
    /**
     * Optionally overwrite values for some or all columns
     */
    columns?: BuildColumns<TFixture>;
  } = {
    deep: false,
    columns: {},
  },
): TFixture => ({
  ...fixture,
  columns: {
    ...(deep
      ? mapValues(
          (column) => (isRelColumnBuilder(column) ? { ...column, fixture: cloneFixture(column.fixture) } : column),
          fixture.columns,
        )
      : fixture.columns),
    ...columns,
  },
});

/**
 * The default entity id generator. Generates a serial autoincrement value
 */
export const generateIdSequnce: GenerateId = (previousId) => (previousId ?? 0) + 1;

/**
 * Create multiple entities from one fixture. Deep clones all of them and their references
 *
 * ```typescript
 * import { fixture, alternate, multiFixture, generate } from '@laminar/fixtures';
 * const myFixture = fixture('mytable', { type: alternate('Generation', 'Export') });
 *
 * console.log(generate(multiFixture(2, myFixture)));
 * // would output
 * [
 *   { table: 'mytable', columns: { type: 'Generation' } },
 *   { table: 'mytable', columns: { type: 'Export' } },
 * ]
 * ```
 */
export const multiFixture = (
  size: number,
  fixture: Fixture,
  options?: {
    /**
     * If true, all the referenced (with rel) fixtures will be cloned recursively
     */
    deep?: boolean;
  },
): Fixture[] => Array.from(Array(size)).map(() => cloneFixture(fixture, options));

/**
 * Generate entities from fixtures, resolving dependencies
 *
 * ```typescript
 * import { fixture, id, rel, generate } from '@laminar/fixtures';
 * const one = fixture('table1', { id });
 * const two = fixture('table2', { id });
 *
 * console.log(generate([one, two]));
 * // would output
 * [
 *   { table: 'table1', columns: { id: 1 } },
 *   { table: 'table2', columns: { id: 1 } },
 * ]
 * ```
 */
export const generate = (fixtures: Fixture[], context: Context = {}): Entity[] => [
  ...(entitiesWithContext(context, fixtures).entities?.values() ?? []),
];
