import {
  printDocument,
  document,
  Document,
  DocumentContext,
  Type,
  withIdentifier,
  withImports,
} from '@ovotech/ts-compose';
import ts from 'typescript';
import { toTitleCase } from '../../helpers';

export interface Table {
  columns: Array<{
    isOptional: boolean;
    name: string;
    type: string;
  }>;
  name: string;
}

export interface Enum {
  name: string;
  enum: string[];
}

export interface FixturesParams {
  tables: Table[];
  enums: Enum[];
  suffix?: string;
  titleCase?: boolean;
}

const sqlTypes: { [type: string]: ts.TypeNode } = {
  integer: Type.Number,
  float: Type.Number,
  date: Type.Referance('Date'),
  datetime: Type.Referance('Date'),
  timestamp: Type.Referance('Date'),
  'timestamp without time zone': Type.Referance('Date'),
  'timestamp with time zone': Type.Referance('Date'),
  boolean: Type.Boolean,
};

export const convertType = (
  context: DocumentContext,
  { tables, enums, suffix, titleCase }: FixturesParams,
): Document<ts.JSDoc> =>
  document(
    tables.reduce((current, { name, columns }) => {
      const tableName = `${titleCase ? toTitleCase(name) : name}${suffix ?? ''}`;
      return withImports(
        withIdentifier(
          current,
          Type.Alias({
            jsDoc: `Fixture type for table "${name}" with column types loaded from the database
You can use the type with a fixutre, or by creating a fixture builder

\`\`\`typescript
import { fixture, BuildFixture } from '@ovotech/laminar-fixtures';
const my${tableName} = fixture<${tableName}>({
  // ...
});

const build${tableName}: BuildFixture<${tableName}> => ({ columns }) => fixture({
  // ...
  ...columns
});
\`\`\``,
            name: tableName,
            isExport: true,
            type: Type.Referance('Fixture', [
              Type.TypeLiteral({
                props: columns.map((column) => {
                  const columnEnum = enums.find(({ name }) => name === column.type);
                  return Type.Prop({
                    isOptional: column.isOptional,
                    name: column.name,
                    type: columnEnum
                      ? Type.Union(columnEnum.enum.map((item) => Type.Literal(item)))
                      : sqlTypes[column.type] ?? Type.String,
                  });
                }),
              }),
            ]),
          }),
        ),
        { module: '@ovotech/laminar-fixtures', named: [{ name: 'Fixture' }] },
      );
    }, context),
    ts.factory.createJSDocComment('Fixtures generated for postgres tables'),
  );

export const toTypeScript = (params: FixturesParams): string => printDocument(convertType({}, params));
