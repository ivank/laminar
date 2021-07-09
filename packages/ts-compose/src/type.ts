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
  Any: ts.factory.createToken(ts.SyntaxKind.AnyKeyword),

  String: ts.factory.createToken(ts.SyntaxKind.StringKeyword),

  Number: ts.factory.createToken(ts.SyntaxKind.NumberKeyword),

  Null: ts.factory.createLiteralTypeNode(ts.factory.createToken(ts.SyntaxKind.NullKeyword)),

  Boolean: ts.factory.createToken(ts.SyntaxKind.BooleanKeyword),

  Object: ts.factory.createToken(ts.SyntaxKind.ObjectKeyword),

  Void: ts.factory.createToken(ts.SyntaxKind.VoidKeyword),

  Unknown: ts.factory.createToken(ts.SyntaxKind.UnknownKeyword),

  Never: ts.factory.createToken(ts.SyntaxKind.NeverKeyword),

  Undefined: ts.factory.createToken(ts.SyntaxKind.UndefinedKeyword),

  TypeLiteral: ({
    props = [],
    index,
  }: {
    props?: ts.TypeElement[];
    index?: ts.IndexSignatureDeclaration;
  } = {}): ts.TypeLiteralNode => ts.factory.createTypeLiteralNode([...props, ...(index ? [index] : [])]),

  Array: (type: ts.TypeNode): ts.ArrayTypeNode => ts.factory.createArrayTypeNode(type),

  Union: (types: ts.TypeNode[]): ts.UnionTypeNode => ts.factory.createUnionTypeNode(types),

  Intersection: (types: ts.TypeNode[]): ts.IntersectionTypeNode => ts.factory.createIntersectionTypeNode(types),

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

  LiteralString: (value: string): ts.StringLiteral => ts.factory.createStringLiteral(value),

  Arrow: ({ args, ret }: { args: ts.ParameterDeclaration[]; ret: ts.TypeNode }): ts.FunctionTypeNode =>
    ts.factory.createFunctionTypeNode(undefined, args, ret),

  Optional: (isOptional?: boolean): ts.Token<ts.SyntaxKind.QuestionToken> | undefined =>
    isOptional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,

  Public: (isPublic?: boolean): ts.Token<ts.SyntaxKind.PublicKeyword>[] =>
    isPublic ? [ts.factory.createModifier(ts.SyntaxKind.PublicKeyword)] : [],

  Readonly: (isReadonly?: boolean): ts.Token<ts.SyntaxKind.ReadonlyKeyword>[] =>
    isReadonly ? [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : [],

  Private: (isPrivate?: boolean): ts.Token<ts.SyntaxKind.PrivateKeyword>[] =>
    isPrivate ? [ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword)] : [],

  Export: (
    isExport?: boolean,
    isDefault?: boolean,
  ): ts.Token<ts.SyntaxKind.ExportKeyword | ts.SyntaxKind.DefaultKeyword>[] => [
    ...(isExport ? [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)] : []),
    ...(isDefault ? [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)] : []),
  ],

  Protected: (isProtected?: boolean): ts.Token<ts.SyntaxKind.ProtectedKeyword>[] =>
    isProtected ? [ts.factory.createModifier(ts.SyntaxKind.ProtectedKeyword)] : [],

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

  Prop: ({
    name,
    type,
    initializer,
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
    initializer?: ts.Expression;
    jsDoc?: string;
  }): ts.PropertySignature =>
    withJSDoc(
      jsDoc,
      ts.createPropertySignature(
        [
          ...Type.Readonly(isReadonly),
          ...Type.Public(isPublic),
          ...Type.Private(isPrivate),
          ...Type.Protected(isProtected),
        ],
        typeof name === 'string' && !isIdentifierString(name) ? ts.factory.createStringLiteral(name) : name,
        Type.Optional(isOptional),
        type,
        initializer,
      ),
    ),

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

  TypeArg: ({
    name,
    ext,
    defaultType,
  }: {
    name: string | ts.Identifier;
    ext?: ts.TypeNode;
    defaultType?: ts.TypeNode;
  }): ts.TypeParameterDeclaration => ts.factory.createTypeParameterDeclaration(name, ext, defaultType),

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

  Referance: (name: string | ts.Identifier | string[], types?: ts.TypeNode[]): ts.TypeReferenceNode => {
    const fullName = Array.isArray(name)
      ? name.reduce<ts.QualifiedName | ts.Identifier | undefined>(
          (acc, item) => (acc ? ts.factory.createQualifiedName(acc, item) : ts.factory.createIdentifier(item)),
          undefined,
        )
      : name;

    return ts.factory.createTypeReferenceNode(fullName ?? '', types);
  },

  Tuple: (types: ts.TypeNode[]): ts.TupleTypeNode => ts.factory.createTupleTypeNode(types),

  TypeExpression: ({
    name,
    types,
  }: {
    name: string | ts.Identifier;
    types?: ts.TypeNode[];
  }): ts.ExpressionWithTypeArguments =>
    ts.factory.createExpressionWithTypeArguments(typeof name === 'string' ? ts.createIdentifier(name) : name, types),

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
