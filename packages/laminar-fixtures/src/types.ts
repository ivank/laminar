/**
 * Id generator. A function to get the next ID for a table, given the previous id.
 */
export type GenerateId = (previousId: number | undefined, table: string) => number;

export const ColumnBuilder = Symbol('ColumnBuilder');

/**
 * Context for entities generation.
 * Keeps a map of all the previously generated entities so they can be reused if encountered in relationships,
 * as well as maps of previously generated Ids
 */
export interface Context {
  /**
   * Keep a map of id for generated entites. Keyed by table
   * Allows us to answer the question "which is the latest id generated for a given table"
   */
  idMap?: Record<string, number>;
  /**
   * Keeps a map of all the previously generated entities so they can be reused if encountered in relationships
   */
  entities?: Map<Fixture, Entity>;
  /**
   * The function to generate new ids with
   */
  generateId?: GenerateId;
}

/**
 * A function converting the current table id and context into a column.
 */
export interface ColumnBuilder {
  [ColumnBuilder]: (id: number, context: Context) => { value: unknown; context: Context };
}

/**
 * A special variant of {@link ColumnBuilder} that keeps track of the fixture its referencing,
 * so that it can be changed before the entity has been generated.
 */
export interface RelColumnBuilder {
  fixture: Fixture;
  [ColumnBuilder]: (id: number, context: Context, fixture: Fixture) => { value: unknown; context: Context };
}

export type FixtureColumn =
  | ColumnBuilder
  | RelColumnBuilder
  | string
  | number
  | boolean
  | null
  | Date
  | ((id: number, context: Context) => unknown);

export type EntityColumns = Record<string, unknown>;
export type FixtureColumns = Record<string, FixtureColumn>;

export type Fixture<TFixtureColumns extends FixtureColumns = FixtureColumns> = {
  columns: TFixtureColumns;
  table: string;
};
export type Entity = { columns: EntityColumns; table: string };
