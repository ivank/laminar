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
    typeof name === 'string' ? ts.createIdentifier(name) : name,

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
  }): ts.ArrowFunction => ts.createArrowFunction(undefined, typeArgs, args, ret, undefined, body),

  Block: ({
    statements,
    multiline,
  }: {
    statements: ts.Statement[];
    multiline?: boolean;
  }): ts.Block => ts.createBlock(statements, multiline),

  Return: (expression: ts.Expression): ts.ReturnStatement => ts.createReturn(expression),

  Call: ({
    expression,
    args,
    typeArgs,
  }: {
    expression: ts.LeftHandSideExpression;
    args?: ts.Expression[];
    typeArgs?: ts.TypeNode[];
  }): ts.CallExpression => ts.createCall(expression, typeArgs, args),

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
  TemplateString: (text: string): ts.TemplateLiteral =>
    ts.createNoSubstitutionTemplateLiteral(text, text),

  ObjectLiteral: ({
    jsDoc,
    props,
    multiline,
  }: {
    jsDoc?: string;
    props: ts.PropertyAssignment[];
    multiline?: boolean;
  }) => withJSDoc(jsDoc, ts.createObjectLiteral(props, multiline)),

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
    return withJSDoc(
      jsDoc,
      ts.createPropertyAssignment(escapedKey, Node.Literal({ value, multiline })),
    );
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
      return ts.createNull();
    } else if (typeof value === 'object') {
      if (isTsNode(value)) {
        return value;
      } else {
        return ts.createObjectLiteral(
          Object.keys(value).map((key) => {
            const escapedKey = isIdentiferString(key) ? key : Type.LiteralString(key);

            return ts.createPropertyAssignment(
              escapedKey,
              Node.Literal({ value: value[key], multiline }),
            );
          }),
          multiline,
        );
      }
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
    value?: LiteralValue | ts.ArrowFunction;
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
