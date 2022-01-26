import ts from 'typescript';
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
  /**
   * An identifier expression
   *
   * ```typescript
   * Node.Call({ expression: Node.Identifier('create'), args: [Node.Identifier('axiosConfig')] })
   * // Would generate
   * create(axiosConfig)
   * ```
   */
  Identifier: (name: string | ts.Identifier): ts.Identifier =>
    typeof name === 'string' ? ts.factory.createIdentifier(name) : name,

  /**
   * Arrow function
   *
   * ```typescript
   * Node.Arrow({ args: [], body: Node.Literal({ value: 'something' }) })
   * // would generate
   * () => "something"
   * ```
   * A more complex example with a function block:
   * ```typescript
   * Node.Arrow({
   *   args: [Type.Param({ name: 'a', type: Type.Number })],
   *   body: Node.Block({
   *     statements: [
   *       Node.Return(Node.Call({ expression: Node.Identifier('otherFunction'), args: [Node.Identifier('a')] })),
   *     ],
   *   }),
   * }),
   * // would generate
   * (a: number) => { return otherFunction(a); }
   * ```
   */
  Arrow: ({
    typeArgs,
    isAsync,
    args,
    ret,
    body,
  }: {
    typeArgs?: ts.TypeParameterDeclaration[];
    args: ts.ParameterDeclaration[];
    ret?: ts.TypeNode;
    body: ts.ConciseBody;
    isAsync?: boolean;
  }): ts.ArrowFunction =>
    ts.factory.createArrowFunction(
      isAsync ? [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)] : undefined,
      typeArgs,
      args,
      ret,
      undefined,
      body,
    ),

  /**
   * A block of statements (code wrapped in "{" and "}"). Must contain items of type "statement"
   * ```typescript
   * Node.Block({
   *   statements: [
   *     Node.ExpressionStatement(Node.Call({ expression: Node.Identifier('one'), args: [] })),
   *     Node.ExpressionStatement(Node.Call({ expression: Node.Identifier('two'), args: [] })),
   *   ],
   * });
   * // would generate
   * {
   *   one();
   *   two();
   * }
   * ```
   */
  Block: ({ statements, multiline }: { statements: ts.Statement[]; multiline?: boolean }): ts.Block =>
    ts.factory.createBlock(statements, multiline),

  /**
   * Assignment
   * ```typescript
   * Node.Assignment(
   *   Node.Identifier('one'),
   *   Node.Literal(4)
   * );
   * // would generate
   * one = 4
   * ```
   */
  Assignment: (
    left: ts.Expression | ts.ObjectLiteralExpression | ts.ArrayLiteralExpression,
    right: ts.Expression,
  ): ts.AssignmentExpression<ts.EqualsToken> | ts.DestructuringAssignment => ts.factory.createAssignment(left, right),

  /**
   * Await
   * ```typescript
   * Node.Await(
   *   Node.Call({ expression: Node.Identifier('one')}),
   * );
   * // would generate
   * await one();
   * ```
   */
  Await: (body: ts.Expression): ts.AwaitExpression => ts.factory.createAwaitExpression(body),

  /**
   * Create a generic expression statement.
   * ```typescript
   * Node.ExpressionStatement(Node.Call({ expression: Node.Identifier('one'), args: [] }))
   * // would generate
   * one();
   * ```
   */
  ExpressionStatement: (expression: ts.Expression): ts.Statement => ts.factory.createExpressionStatement(expression),

  /**
   * A return statement
   * ```typescript
   * Node.Return(Node.Call({ expression: Node.Identifier('one'), args: [] }))
   * // would generate
   * return one();
   * ```
   */
  Return: (expression: ts.Expression): ts.ReturnStatement => ts.factory.createReturnStatement(expression),

  /**
   * A call expression
   *
   * ```typescript
   * Node.Call({ expression: Node.Identifier('otherFunction'), args: [Node.Identifier('a')] })
   * // would generate
   * otherFunction(a)
   * ```
   */
  Call: ({
    expression,
    args,
    typeArgs,
  }: {
    expression: ts.LeftHandSideExpression;
    args?: ts.Expression[];
    typeArgs?: ts.TypeNode[];
  }): ts.CallExpression => ts.factory.createCallExpression(expression, typeArgs, args),

  /**
   * An import declaration statement
   *
   * ```typescript
   * Node.Import({ defaultAs: 'Axios', module: 'axios' })
   * // would generate
   * import Axios from "axios";
   * ```
   * ```typescript
   * Node.Import({ allAs: 'axios', module: 'axios' })
   * // would generate
   * import * as axios from "axios";
   * ```
   * ```typescript
   * Node.Import({ named: [{ name: 'AxiosInstance' }, { name: 'AxiosRequestConfig' }], module: 'axios' })
   * // would generate
   * import { AxiosInstance, AxiosRequestConfig } from "axios";
   * ```
   * ```typescript
   * Node.Import({ named: [{ name: 'AxiosInstance', as: 'a' }], module: 'axios' })
   * // would generate
   * import { AxiosInstance as a } from "axios";
   * ```
   */
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
      ts.factory.createImportClause(
        false,
        defaultAs ? Node.Identifier(defaultAs) : undefined,
        named
          ? ts.factory.createNamedImports(
              named.map((item) =>
                ts.factory.createImportSpecifier(
                  false,
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
  /**
   * Template string (backticks)
   * ```typescript
   * Node.TemplateString('test${var}')
   * // would generate
   * `test${var}`
   * ```
   */
  TemplateString: (text: string): ts.TemplateLiteral => ts.factory.createNoSubstitutionTemplateLiteral(text, text),

  /**
   * Object literal ({ })
   * ```typescript
   * Node.ObjectLiteral({ props: [Node.ObjectLiteralProp({ key: 'test', value: 10 })] })
   * // would generate
   * { test: 10 }
   * ```
   */
  ObjectLiteral: ({
    jsDoc,
    props,
    multiline,
  }: {
    jsDoc?: string;
    props: ts.PropertyAssignment[];
    multiline?: boolean;
  }) => withJSDoc(jsDoc, ts.factory.createObjectLiteralExpression(props, multiline)),

  /**
   * Property for object literal
   * ```typescript
   * Node.ObjectLiteral({ props: [Node.ObjectLiteralProp({ key: 'test', value: 10 })] })
   * // would generate
   * { test: 10 }
   * ```
   */
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

  /**
   * A helper to create different literals.
   *
   * ```typescript
   * Node.Literal({ value: 'test' })
   * // would generate
   * 'test'
   * ```
   * ```typescript
   * Node.Literal({ value: true })
   * // would generate
   * true
   * ```
   * ```typescript
   * Node.Literal({ value: 10 })
   * // would generate
   * 10
   * ```
   * ```typescript
   * Node.Literal({ value: { key: 'test' } })
   * // would generate
   * { key: 'test' }
   * ```
   */
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

  /**
   * Enum member
   * ```typescript
   * Node.Enum({ name: 'Animals' members: [Node.EnumMember({ name: 'Cat' }), Node.EnumMember({ name: 'Dog' })] })
   * // would generate
   * enum Animals { Cat, Dog }
   * ```
   */
  EnumMember: ({ name, value }: { name: string | ts.Identifier; value?: string | number }): ts.EnumMember =>
    ts.factory.createEnumMember(
      name,
      value
        ? typeof value === 'string'
          ? ts.factory.createStringLiteral(value)
          : ts.factory.createNumericLiteral(value)
        : undefined,
    ),

  /**
   * Enum
   * ```typescript
   * Node.Enum({ name: 'Animals' members: [Node.EnumMember({ name: 'Cat' }), Node.EnumMember({ name: 'Dog' })] })
   * // would generate
   * enum Animals { Cat, Dog }
   * ```
   */
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

  /**
   * A const statement
   * ```typescript
   * Node.Const({ name: 'n', value: '10' })
   * // would generate
   * const n = 10;
   * ```
   * ```typescript
   * Node.Const({ name: 'o', value: { test: 10 } })
   * // would generate
   * const o = { test: 10 };
   * ```
   */
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
