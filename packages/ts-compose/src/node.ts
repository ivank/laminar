import * as ts from 'typescript';
import { withJSDoc } from './docs';
import { Type } from './type';

export type LiteralValue = ObjectLiteralValue | string | number | boolean | null;

export interface ObjectLiteralValue {
  [key: string]: LiteralValue;
}

export const Node = {
  Identifier: (name: string | ts.Identifier): ts.Identifier =>
    typeof name === 'string' ? ts.createIdentifier(name) : name,

  Import: ({
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
        defaultAs ? Node.Identifier(defaultAs) : undefined,
        named
          ? ts.createNamedImports(
              named.map((item) =>
                ts.createImportSpecifier(
                  item.as ? Node.Identifier(item.name) : undefined,
                  item.as ? Node.Identifier(item.as) : Node.Identifier(item.name),
                ),
              ),
            )
          : allAs
          ? ts.createNamespaceImport(Node.Identifier(allAs))
          : undefined,
      ),
      ts.createStringLiteral(module),
    ),

  Literal: ({
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
        Object.keys(value).map((key) =>
          ts.createPropertyAssignment(key, Node.Literal({ value: value[key], multiline })),
        ),
        multiline,
      );
    } else {
      return ts.createLiteral(value);
    }
  },

  EnumMember: ({
    name,
    value,
  }: {
    name: string | ts.Identifier;
    value?: string | number;
  }): ts.EnumMember => ts.createEnumMember(name, value ? ts.createLiteral(value) : undefined),

  Enum: ({
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
    withJSDoc(jsDoc, ts.createEnumDeclaration([], Type.Export(isExport, isDefault), name, members)),

  Const: ({
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
      jsDoc,
      ts.createVariableStatement(
        Type.Export(isExport, isDefault),
        ts.createVariableDeclarationList(
          [
            ts.createVariableDeclaration(
              name,
              type,
              value === undefined ? undefined : Node.Literal({ value, multiline }),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    ),

  NamespaceBlock: ({
    name,
    block,
    isExport,
    isDefault,
    jsDoc,
  }: {
    name: string;
    block: ts.Statement[];
    isExport?: boolean;
    isDefault?: boolean;
    jsDoc?: string;
  }): ts.ModuleDeclaration =>
    withJSDoc(
      jsDoc,
      ts.createModuleDeclaration(
        [],
        Type.Export(isExport, isDefault),
        ts.createIdentifier(name),
        ts.createModuleBlock(block),
        ts.NodeFlags.Namespace,
      ),
    ),
};
