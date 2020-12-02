import * as ts from 'typescript';
import { withJSDoc } from './docs';
import { Type } from './type';

export type LiteralValue = ts.Expression | ObjectLiteralValue | string | number | boolean | null;

export interface ObjectLiteralValue {
  [key: string]: LiteralValue;
}

// eslint-disable-next-line @typescript-eslint/ban-types
const isTsNode = (item: {}): item is ts.Node =>
  item !== null && typeof item === 'object' && 'kind' in item && 'end' in item;

const isIdentiferString = (item: string): boolean => /^[0-9a-zA-Z_$]+$/.test(item);

export const Node = {
  Identifier: (name: string | ts.Identifier): ts.Identifier =>
    typeof name === 'string' ? ts.factory.createIdentifier(name) : name,

  Arrow: ({
    typeArgs,
    args,
    ret,
    body,
  }: {
    typeArgs?: ts.TypeParameterDeclaration[];
    args: ts.ParameterDeclaration[];
    ret?: ts.TypeNode;
    body: ts.ConciseBody;
  }): ts.ArrowFunction => ts.factory.createArrowFunction(undefined, typeArgs, args, ret, undefined, body),

  Block: ({ statements, multiline }: { statements: ts.Statement[]; multiline?: boolean }): ts.Block =>
    ts.factory.createBlock(statements, multiline),

  Return: (expression: ts.Expression): ts.ReturnStatement => ts.factory.createReturnStatement(expression),

  Call: ({
    expression,
    args,
    typeArgs,
  }: {
    expression: ts.LeftHandSideExpression;
    args?: ts.Expression[];
    typeArgs?: ts.TypeNode[];
  }): ts.CallExpression => ts.factory.createCallExpression(expression, typeArgs, args),

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
    ts.factory.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        defaultAs ? Node.Identifier(defaultAs) : undefined,
        named
          ? ts.factory.createNamedImports(
              named.map((item) =>
                ts.factory.createImportSpecifier(
                  item.as ? Node.Identifier(item.name) : undefined,
                  item.as ? Node.Identifier(item.as) : Node.Identifier(item.name),
                ),
              ),
            )
          : allAs
          ? ts.factory.createNamespaceImport(Node.Identifier(allAs))
          : undefined,
      ),
      ts.factory.createStringLiteral(module),
    ),
  TemplateString: (text: string): ts.TemplateLiteral => ts.factory.createNoSubstitutionTemplateLiteral(text, text),

  ObjectLiteral: ({
    jsDoc,
    props,
    multiline,
  }: {
    jsDoc?: string;
    props: ts.PropertyAssignment[];
    multiline?: boolean;
  }) => withJSDoc(jsDoc, ts.factory.createObjectLiteralExpression(props, multiline)),

  ObjectLiteralProp: ({
    key,
    value,
    multiline,
    jsDoc,
  }: {
    key: string;
    value: LiteralValue;
    multiline?: boolean;
    jsDoc?: string;
  }) => {
    const escapedKey = isIdentiferString(key) ? key : Type.LiteralString(key);
    return withJSDoc(jsDoc, ts.factory.createPropertyAssignment(escapedKey, Node.Literal({ value, multiline })));
  },
  Literal: ({
    value,
    multiline,
  }: {
    value: LiteralValue;
    multiline?: boolean;
  }):
    | ts.Expression
    | ts.ObjectLiteralExpression
    | ts.StringLiteral
    | ts.BooleanLiteral
    | ts.NullLiteral
    | ts.NumericLiteral
    | ts.PrimaryExpression => {
    if (value === null) {
      return ts.factory.createNull();
    } else if (typeof value === 'object') {
      if (isTsNode(value)) {
        return value;
      } else {
        return ts.factory.createObjectLiteralExpression(
          Object.keys(value).map((key) => {
            const escapedKey = isIdentiferString(key) ? key : Type.LiteralString(key);

            return ts.factory.createPropertyAssignment(escapedKey, Node.Literal({ value: value[key], multiline }));
          }),
          multiline,
        );
      }
    } else if (typeof value === 'string') {
      return ts.factory.createStringLiteral(value);
    } else if (value === true) {
      return ts.factory.createTrue();
    } else if (value === false) {
      return ts.factory.createFalse();
    } else {
      return ts.factory.createNumericLiteral(value);
    }
  },

  EnumMember: ({ name, value }: { name: string | ts.Identifier; value?: string | number }): ts.EnumMember =>
    ts.factory.createEnumMember(
      name,
      value
        ? typeof value === 'string'
          ? ts.factory.createStringLiteral(value)
          : ts.factory.createNumericLiteral(value)
        : undefined,
    ),

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
    withJSDoc(jsDoc, ts.factory.createEnumDeclaration([], Type.Export(isExport, isDefault), name, members)),

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
    value?: LiteralValue | ts.ArrowFunction;
    isExport?: boolean;
    isDefault?: boolean;
    jsDoc?: string;
  }): ts.VariableStatement =>
    withJSDoc(
      jsDoc,
      ts.factory.createVariableStatement(
        Type.Export(isExport, isDefault),
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              name,
              undefined,
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
      ts.factory.createModuleDeclaration(
        [],
        Type.Export(isExport, isDefault),
        ts.factory.createIdentifier(name),
        ts.factory.createModuleBlock(block),
        ts.NodeFlags.Namespace,
      ),
    ),
};
