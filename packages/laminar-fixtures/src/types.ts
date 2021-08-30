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

export type FixtureValue = string | number | boolean | null | Date;
export type FixtureValues = Record<string, FixtureValue>;
export type ExtractFixtureValue<TValue> = TValue extends FixtureColumn<infer X> ? X : never;

/**
 * A function converting the current table id and context into a column.
 */
export interface ColumnBuilder<TValue = FixtureValue> {
  [ColumnBuilder]: (id: number, context: Context) => { value: TValue; context: Context };
}

/**
 * A special variant of {@link ColumnBuilder} that keeps track of the fixture its referencing,
 * so that it can be changed before the entity has been generated.
 */
export interface RelColumnBuilder<TValue = FixtureValue> {
  fixture: Fixture;
  [ColumnBuilder]: (id: number, context: Context, fixture: Fixture) => { value: TValue; context: Context };
}

export type FixtureColumn<TValue = FixtureValue> =
  | ColumnBuilder<TValue>
  | RelColumnBuilder<TValue>
  | TValue
  | ((id: number, context: Context) => TValue);

export type EntityColumns = Record<string, FixtureValue>;

export type FixtureColumns<TValues extends Record<string, FixtureValue> = Record<string, FixtureValue>> = {
  [Property in keyof TValues]: FixtureColumn<TValues[Property]>;
};

export type Fixture<TFixtureValues extends FixtureValues = FixtureValues> = {
  columns: FixtureColumns<TFixtureValues>;
  table: string;
  serialColumn: string;
};
export type Entity = { columns: EntityColumns; table: string; serialColumn: string };

export type BuildColumns<TFixture extends Fixture> = Partial<TFixture['columns']>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type BuildFixture<TFixture extends Fixture, Rels extends Record<string, Fixture> = {}> = (
  params?: { columns?: BuildColumns<TFixture> } & Rels,
) => TFixture;
