import ts from 'typescript';
import { withJSDoc } from './docs';

const isIdentifierString = (identifier: string): boolean => {
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    const isValid = i === 0 ? ts.isIdentifierStart(char, undefined) : ts.isIdentifierPart(char, undefined);
    if (!isValid) {
      return false;
    }
  }
  return true;
};

export interface InterfaceExtend {
  name: string;
  types?: ts.TypeNode[];
}

export const Type = {
  /**
   * "any" type
   * ```typescript
   * Node.Const({ type: Type.Any, name: 'a', })
   * // Would generate
   * const a: any;
   * ```
   */
  Any: ts.factory.createToken(ts.SyntaxKind.AnyKeyword),

  /**
   * "string" type
   * ```typescript
   * Node.Const({ type: Type.String, name: 'a', })
   * // Would generate
   * const a: string;
   * ```
   */
  String: ts.factory.createToken(ts.SyntaxKind.StringKeyword),

  /**
   * "number" type
   * ```typescript
   * Node.Const({ type: Type.Number, name: 'a', })
   * // Would generate
   * const a: number;
   * ```
   */
  Number: ts.factory.createToken(ts.SyntaxKind.NumberKeyword),

  /**
   * "null" type
   * ```typescript
   * Node.Const({ type: Type.Union([Type.Number, Type.Null]), name: 'a' })
   * // Would generate
   * const a: number | null;
   * ```
   */
  Null: ts.factory.createLiteralTypeNode(ts.factory.createToken(ts.SyntaxKind.NullKeyword)),

  /**
   * "boolean" type
   * ```typescript
   * Node.Const({ type: Type.Boolean, name: 'a', })
   * // Would generate
   * const a: boolean;
   * ```
   */
  Boolean: ts.factory.createToken(ts.SyntaxKind.BooleanKeyword),

  /**
   * "object" type
   * ```typescript
   * Node.Const({ type: Type.Object, name: 'a', })
   * // Would generate
   * const a: object;
   * ```
   */
  Object: ts.factory.createToken(ts.SyntaxKind.ObjectKeyword),

  /**
   * "void" type
   * ```typescript
   * Node.Const({ type: Type.Union([Type.Number, Type.Void]), name: 'a' })
   * // Would generate
   * const a: number | void;
   * ```
   */
  Void: ts.factory.createToken(ts.SyntaxKind.VoidKeyword),

  /**
   * "unknown" type
   * ```typescript
   * Node.Const({ type: Type.Unknown, name: 'a' })
   * // Would generate
   * const a: unknown;
   * ```
   */
  Unknown: ts.factory.createToken(ts.SyntaxKind.UnknownKeyword),

  /**
   * "never" type
   * ```typescript
   * Node.Const({ type: Type.Union([Type.Number, Type.Never]), name: 'a' })
   * // Would generate
   * const a: number | never;
   * ```
   */
  Never: ts.factory.createToken(ts.SyntaxKind.NeverKeyword),

  /**
   * "undefined" type
   * ```typescript
   * Node.Const({ type: Type.Union([Type.Number, Type.Undefined]), name: 'a' })
   * // Would generate
   * const a: number | undefined;
   * ```
   */
  Undefined: ts.factory.createToken(ts.SyntaxKind.UndefinedKeyword),

  /**
   * Type literal
   * ```typescript
   * Node.Const({
   *   name: 'a',
   *   type: Type.TypeLiteral({
   *     props: [
   *       Type.Prop({ name: 'test1', type: Type.String, isOptional: true }),
   *       Type.Prop({ name: 'test2', type: Type.Number }),
   *     ],
   *   }),
   * })
   * // Would generate
   * const a: {
   *   test1?: string;
   *   test2: number;
   * };
   * ```
   */
  TypeLiteral: ({
    props = [],
    index,
  }: {
    props?: ts.TypeElement[];
    index?: ts.IndexSignatureDeclaration;
  } = {}): ts.TypeLiteralNode => ts.factory.createTypeLiteralNode([...props, ...(index ? [index] : [])]),

  /**
   * Array type, can be nested
   * ```typescript
   * Node.Const({ type: Type.Array(Type.String), name: 'a' })
   * // Would generate
   * const a: string[];
   * ```
   * ```typescript
   * Node.Const({ type: Type.Array(Type.Array(Type.String)), name: 'a' })
   * // Would generate
   * const a: string[][];
   * ```
   */
  Array: (type: ts.TypeNode): ts.ArrayTypeNode => ts.factory.createArrayTypeNode(type),

  /**
   * union type
   * ```typescript
   * Node.Const({ type: Type.Union([Type.String, Type.Number]), name: 'a' })
   * // Would generate
   * const a: string | number;
   * ```
   */
  Union: (types: ts.TypeNode[]): ts.UnionTypeNode => ts.factory.createUnionTypeNode(types),

  /**
   * intersection type
   * ```typescript
   * Node.Const({
   *   type: Type.Intersection([
   *     Type.TypeLiteral({ props: [Type.Prop({ name: 'b', type: Type.String })] }),
   *     Type.TypeLiteral({ props: [Type.Prop({ name: 'c', type: Type.String })] }),
   *   ]),
   *   name: 'a',
   * })
   * // Would generate
   * const a: { b: string } & { c: string };
   * ```
   */
  Intersection: (types: ts.TypeNode[]): ts.IntersectionTypeNode => ts.factory.createIntersectionTypeNode(types),

  /**
   * A type of a literal value
   * ```typescript
   * Node.Const({ type: Type.Union([Type.Literal(1), Type.Literal(2)]), name: 'a' })
   * // Would generate
   * const a: 1 | 2;
   * ```
   */
  Literal: (value: unknown): ts.LiteralTypeNode | ts.KeywordTypeNode => {
    switch (typeof value) {
      case 'number':
        return ts.factory.createLiteralTypeNode(ts.factory.createNumericLiteral(value));
      case 'string':
        return ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(value));
      case 'boolean':
        return ts.factory.createLiteralTypeNode(value === true ? ts.factory.createTrue() : ts.factory.createFalse());
      default:
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    }
  },

  /**
   * A literal string type.
   * Useful in situations where you need a ts.StringLiteral specifically
   * ```typescript
   * Node.Const({ type: Type.Union([Type.LiteralString("one"), Type.LiteralString("two")]), name: 'a' })
   * // Would generate
   * const a: "one" | "two";
   * ```
   */
  LiteralString: (value: string): ts.StringLiteral => ts.factory.createStringLiteral(value),

  /**
   * Arrow function type
   * ```typescript
   * Type.Arrow({ args: [Type.Param({ name: 'a', type: Type.String })], ret: Type.Number })
   * // Would generate
   * (a: string) => number
   * ```
   */
  Arrow: ({ args, ret }: { args: ts.ParameterDeclaration[]; ret: ts.TypeNode }): ts.FunctionTypeNode =>
    ts.factory.createFunctionTypeNode(undefined, args, ret),

  /**
   * Set something as optional - used internally throughout the types
   */
  Optional: (isOptional?: boolean): ts.Token<ts.SyntaxKind.QuestionToken> | undefined =>
    isOptional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,

  /**
   * Set something as public - used internally throughout the types
   */
  Public: (isPublic?: boolean): ts.Token<ts.SyntaxKind.PublicKeyword>[] =>
    isPublic ? [ts.factory.createModifier(ts.SyntaxKind.PublicKeyword)] : [],

  /**
   * Set something as readonly - used internally throughout the types
   */
  Readonly: (isReadonly?: boolean): ts.Token<ts.SyntaxKind.ReadonlyKeyword>[] =>
    isReadonly ? [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : [],

  /**
   * Set something as private - used internally throughout the types
   */
  Private: (isPrivate?: boolean): ts.Token<ts.SyntaxKind.PrivateKeyword>[] =>
    isPrivate ? [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)] : [],

  /**
   * Set something as exported - used internally throughout the types
   */
  Export: (
    isExport?: boolean,
    isDefault?: boolean,
  ): ts.Token<ts.SyntaxKind.ExportKeyword | ts.SyntaxKind.DefaultKeyword>[] => [
    ...(isExport ? [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)] : []),
    ...(isDefault ? [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)] : []),
  ],

  /**
   * Set something as protected - used internally throughout the types
   */
  Protected: (isProtected?: boolean): ts.Token<ts.SyntaxKind.ProtectedKeyword>[] =>
    isProtected ? [ts.factory.createModifier(ts.SyntaxKind.ProtectedKeyword)] : [],

  /**
   * Define a method type
   *
   * ```typescript
   * Type.Interface({
   *   name: 'test',
   *   props: [
   *     Type.Method({
   *       name: 'get',
   *       params: [Type.Param({ name: 'T1', type: Type.Number })],
   *     }),
   *     Type.Method({
   *       name: 'get',
   *       typeArgs: [Type.TypeArg({ name: 'T2' })],
   *       params: [Type.Param({ name: 'T3', type: Type.String, isOptional: true })],
   *       type: Type.Any,
   *     }),
   *   ],
   * })
   * // Would generate
   * interface test {
   *   get(T1: number);
   *   get<T2>(T3?: string): any;
   * }
   * ```
   */
  Method: ({
    typeArgs,
    name,
    params,
    type,
    jsDoc,
    isOptional,
  }: {
    typeArgs?: ts.TypeParameterDeclaration[];
    params: ts.ParameterDeclaration[];
    name: string | ts.Identifier;
    isOptional?: boolean;
    type?: ts.TypeNode;
    jsDoc?: string;
  }): ts.MethodSignature =>
    withJSDoc(
      jsDoc,
      ts.factory.createMethodSignature(undefined, name, Type.Optional(isOptional), typeArgs, params, type),
    ),

  /**
   * Define a property type for an interface / type literal
   *
   * ```typescript
   * Type.Interface({ name: 'test', props: [Type.Prop({ name: '11231', type: Type.String })] })
   * // Would generate
   * interface test {
   *   "11231": string;
   * }
   * ```
   */
  Prop: ({
    name,
    type,
    isReadonly,
    isOptional,
    isPublic,
    isPrivate,
    isProtected,
    jsDoc,
  }: {
    name: ts.PropertyName | string | ts.Identifier;
    type: ts.TypeNode;
    isOptional?: boolean;
    isReadonly?: boolean;
    isPublic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
    jsDoc?: string;
  }): ts.PropertySignature =>
    withJSDoc(
      jsDoc,
      ts.factory.createPropertySignature(
        [
          ...Type.Readonly(isReadonly),
          ...Type.Public(isPublic),
          ...Type.Private(isPrivate),
          ...Type.Protected(isProtected),
        ],
        typeof name === 'string' && !isIdentifierString(name) ? ts.factory.createStringLiteral(name) : name,
        Type.Optional(isOptional),
        type,
      ),
    ),

  /**
   * Define a parameter function types, arrow function types and method types
   *
   * ```typescript
   * Type.Arrow({ args: [Type.Param({ name: 'a', type: Type.String })], ret: Type.Number })
   * // Would generate
   * (a: string) => number
   * ```
   */
  Param: ({
    name,
    type,
    isOptional,
    isReadonly,
  }: {
    name: string | ts.Identifier;
    type?: ts.TypeNode;
    isOptional?: boolean;
    isReadonly?: boolean;
  }): ts.ParameterDeclaration =>
    ts.factory.createParameterDeclaration(
      undefined,
      Type.Readonly(isReadonly),
      undefined,
      name,
      Type.Optional(isOptional),
      type,
      undefined,
    ),

  /**
   * Type arg for interfaces and type aliases
   *
   * ```typescript
   * Type.Interface({ name: 'Test', typeArgs: [Type.TypeArg({ name: 'Best' })] })
   * // Would generate
   * interface Test<Best> {
   * }
   * ```
   */
  TypeArg: ({
    name,
    ext,
    defaultType,
    isReadonly,
    isPublic,
    isPrivate,
    isProtected,
  }: {
    name: string | ts.Identifier;
    ext?: ts.TypeNode;
    defaultType?: ts.TypeNode;
    isReadonly?: boolean;
    isPublic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
  }): ts.TypeParameterDeclaration =>
    ts.factory.createTypeParameterDeclaration(
      [
        ...Type.Readonly(isReadonly),
        ...Type.Public(isPublic),
        ...Type.Private(isPrivate),
        ...Type.Protected(isProtected),
      ],
      name,
      ext,
      defaultType,
    ),

  /**
   * Index signature for alias
   * ```typescript
   * Type.Interface({
   *   name: 'Test',
   *   index: Type.Index({ name: 'index', nameType: Type.Number, type: Type.Any }),
   * })
   * // Would generate
   * interface Test {
   *   [index: number]: any;
   * }
   * ```
   */
  Index: ({
    name,
    nameType,
    type,
    isReadonly,
  }: {
    name: string | ts.Identifier;
    nameType: ts.TypeNode;
    type: ts.TypeNode;
    isReadonly?: boolean;
  }): ts.IndexSignatureDeclaration =>
    ts.factory.createIndexSignature(undefined, Type.Readonly(isReadonly), [Type.Param({ name, type: nameType })], type),

  /**
   * References a type alias
   * ```typescript
   * Type.Referance('MyType', [Type.String])
   * // Would generate
   * MyType<string>
   * ```
   */
  Referance: (name: string | ts.Identifier | string[], types?: ts.TypeNode[]): ts.TypeReferenceNode => {
    const fullName = Array.isArray(name)
      ? name.reduce<ts.QualifiedName | ts.Identifier | undefined>(
          (acc, item) => (acc ? ts.factory.createQualifiedName(acc, item) : ts.factory.createIdentifier(item)),
          undefined,
        )
      : name;

    return ts.factory.createTypeReferenceNode(fullName ?? '', types);
  },

  /**
   * Tuple type
   * ```typescript
   * Type.Tuple([Type.String, Type.Number])
   * // Would generate
   * [
   *   string,
   *   number,
   * ]
   * ```
   */
  Tuple: (types: ts.TypeNode[]): ts.TupleTypeNode => ts.factory.createTupleTypeNode(types),

  /**
   * Raw type expression
   * ```typescript
   * Type.TypeExpression({ name: 'T' })
   * // Would generate
   * T
   * ```
   */
  TypeExpression: ({
    name,
    types,
  }: {
    name: string | ts.Identifier;
    types?: ts.TypeNode[];
  }): ts.ExpressionWithTypeArguments =>
    ts.factory.createExpressionWithTypeArguments(
      typeof name === 'string' ? ts.factory.createIdentifier(name) : name,
      types,
    ),

  /**
   * Type alias
   * ```typescript
   * Type.Alias({ name: 'mytype', type: Type.String })
   * // Would generate
   * type mytype = string;
   * ```
   */
  Alias: ({
    name,
    type,
    typeArgs,
    isExport,
    isDefault,
    jsDoc,
  }: {
    name: string | ts.Identifier;
    type: ts.TypeNode;
    isExport?: boolean;
    isDefault?: boolean;
    typeArgs?: ts.TypeParameterDeclaration[];
    jsDoc?: string;
  }): ts.TypeAliasDeclaration =>
    withJSDoc(
      jsDoc,
      ts.factory.createTypeAliasDeclaration(undefined, Type.Export(isExport, isDefault), name, typeArgs, type),
    ),

  /**
   * Define a method type
   *
   * ```typescript
   * Type.Interface({
   *   name: 'test',
   *   props: [Type.Prop({ name: 'val', type: Type.Number })],
   * })
   * // Would generate
   * interface test {
   *   val: number;
   * }
   * ```
   */
  Interface: ({
    name,
    props = [],
    index,
    typeArgs,
    ext,
    isExport,
    isDefault,
    jsDoc,
  }: {
    name: string | ts.Identifier;
    props?: ts.TypeElement[];
    index?: ts.IndexSignatureDeclaration;
    typeArgs?: ts.TypeParameterDeclaration[];
    ext?: InterfaceExtend[];
    isExport?: boolean;
    isDefault?: boolean;
    jsDoc?: string;
  }): ts.InterfaceDeclaration =>
    withJSDoc(
      jsDoc,
      ts.factory.createInterfaceDeclaration(
        undefined,
        Type.Export(isExport, isDefault),
        name,
        typeArgs,
        ext ? [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, ext.map(Type.TypeExpression))] : undefined,
        [...props, ...(index ? [index] : [])],
      ),
    ),
};
