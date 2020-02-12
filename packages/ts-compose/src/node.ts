import * as ts from 'typescript';
import { withJSDoc } from './docs';
import { Export } from './type';

export const Identifier = (name: string | ts.Identifier): ts.Identifier =>
  typeof name === 'string' ? ts.createIdentifier(name) : name;

export const Import = ({
  named,
  allAs,
  defaultAs,
  module,
}: {
  named?: { name: string | ts.Identifier; as?: string }[];
  defaultAs?: string | ts.Identifier;
  allAs?: string;
  module: string;
}): ts.ImportDeclaration =>
  ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      defaultAs ? Identifier(defaultAs) : undefined,
      named
        ? ts.createNamedImports(
            named.map(item =>
              ts.createImportSpecifier(
                item.as ? Identifier(item.name) : undefined,
                item.as ? Identifier(item.as) : Identifier(item.name),
              ),
            ),
          )
        : allAs
        ? ts.createNamespaceImport(Identifier(allAs))
        : undefined,
    ),
    ts.createStringLiteral(module),
  );

export type LiteralValue = ObjectLiteralValue | string | number | boolean | null;

export interface ObjectLiteralValue {
  [key: string]: LiteralValue;
}

export const Literal = ({
  value,
  multiline,
}: {
  value: LiteralValue;
  multiline?: boolean;
}):
  | ts.ObjectLiteralExpression
  | ts.StringLiteral
  | ts.BooleanLiteral
  | ts.NullLiteral
  | ts.NumericLiteral
  | ts.PrimaryExpression => {
  if (value === null) {
    return ts.createNull();
  } else if (typeof value === 'object') {
    return ts.createObjectLiteral(
      Object.keys(value).map(key =>
        ts.createPropertyAssignment(key, Literal({ value: value[key], multiline })),
      ),
      multiline,
    );
  } else {
    return ts.createLiteral(value);
  }
};

export const EnumMember = ({
  name,
  value,
}: {
  name: string | ts.Identifier;
  value?: string | number;
}): ts.EnumMember => ts.createEnumMember(name, value ? ts.createLiteral(value) : undefined);

export const Enum = ({
  name,
  members,
  isExport,
  isDefault,
  jsDoc,
}: {
  name: string | ts.Identifier;
  members: ts.EnumMember[];
  isExport?: boolean;
  isDefault?: boolean;
  jsDoc?: string;
}): ts.EnumDeclaration =>
  withJSDoc(ts.createEnumDeclaration([], Export(isExport, isDefault), name, members), jsDoc);

export const Const = ({
  name,
  type,
  value,
  isExport,
  isDefault,
  multiline,
  jsDoc,
}: {
  name: string | ts.Identifier;
  type?: ts.TypeNode;
  multiline?: boolean;
  value?: LiteralValue;
  isExport?: boolean;
  isDefault?: boolean;
  jsDoc?: string;
}): ts.VariableStatement =>
  withJSDoc(
    ts.createVariableStatement(
      Export(isExport, isDefault),
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            name,
            type,
            value === undefined ? undefined : Literal({ value, multiline }),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    jsDoc,
  );
