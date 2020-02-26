import * as ts from 'typescript';
import { withJSDoc } from './docs';

const isIdentifierString = (identifier: string): boolean => {
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    const isValid =
      i === 0 ? ts.isIdentifierStart(char, undefined) : ts.isIdentifierPart(char, undefined);
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
  Any: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),

  String: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),

  Number: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),

  Null: ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword),

  Boolean: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),

  Object: ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),

  Void: ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),

  Unknown: ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),

  Never: ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),

  TypeLiteral: ({
    props = [],
    index,
  }: {
    props?: ts.TypeElement[];
    index?: ts.IndexSignatureDeclaration;
  } = {}): ts.TypeLiteralNode => ts.createTypeLiteralNode([...props, ...(index ? [index] : [])]),

  Array: (type: ts.TypeNode): ts.ArrayTypeNode => ts.createArrayTypeNode(type),

  Union: (types: ts.TypeNode[]): ts.UnionTypeNode => ts.createUnionTypeNode(types),

  Intersection: (types: ts.TypeNode[]): ts.IntersectionTypeNode =>
    ts.createIntersectionTypeNode(types),

  Literal: (value: unknown): ts.LiteralTypeNode | ts.KeywordTypeNode => {
    switch (typeof value) {
      case 'number':
        return ts.createLiteralTypeNode(ts.createLiteral(value));
      case 'string':
        return ts.createLiteralTypeNode(ts.createLiteral(value));
      case 'boolean':
        return ts.createLiteralTypeNode(ts.createLiteral(value));
      default:
        return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    }
  },

  LiteralString: (value: string): ts.StringLiteral => ts.createLiteral(value),

  Arrow: (args: ts.ParameterDeclaration[], ret: ts.TypeNode): ts.FunctionTypeNode =>
    ts.createFunctionTypeNode(undefined, args, ret),

  Optional: (isOptional?: boolean): ts.Token<ts.SyntaxKind.QuestionToken> | undefined =>
    isOptional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,

  Public: (isPublic?: boolean): ts.Token<ts.SyntaxKind.PublicKeyword>[] =>
    isPublic ? [ts.createModifier(ts.SyntaxKind.PublicKeyword)] : [],

  Readonly: (isReadonly?: boolean): ts.Token<ts.SyntaxKind.ReadonlyKeyword>[] =>
    isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : [],

  Private: (isPrivate?: boolean): ts.Token<ts.SyntaxKind.PrivateKeyword>[] =>
    isPrivate ? [ts.createModifier(ts.SyntaxKind.PrivateKeyword)] : [],

  Export: (
    isExport?: boolean,
    isDefault?: boolean,
  ): ts.Token<ts.SyntaxKind.ExportKeyword | ts.SyntaxKind.DefaultKeyword>[] => [
    ...(isExport ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : []),
    ...(isDefault ? [ts.createModifier(ts.SyntaxKind.DefaultKeyword)] : []),
  ],

  Protected: (isProtected?: boolean): ts.Token<ts.SyntaxKind.ProtectedKeyword>[] =>
    isProtected ? [ts.createModifier(ts.SyntaxKind.ProtectedKeyword)] : [],

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
      ts.createMethodSignature(typeArgs, params, type, name, Type.Optional(isOptional)),
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
        typeof name === 'string' && !isIdentifierString(name) ? ts.createStringLiteral(name) : name,
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
    type: ts.TypeNode;
    isOptional?: boolean;
    isReadonly?: boolean;
  }): ts.ParameterDeclaration =>
    ts.createParameter(
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
  }): ts.TypeParameterDeclaration => ts.createTypeParameterDeclaration(name, ext, defaultType),

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
    ts.createIndexSignature(
      undefined,
      Type.Readonly(isReadonly),
      [Type.Param({ name, type: nameType })],
      type,
    ),

  Referance: (
    name: string | ts.Identifier | string[],
    types?: ts.TypeNode[],
  ): ts.TypeReferenceNode => {
    const fullName = Array.isArray(name)
      ? name.reduce<ts.QualifiedName | ts.Identifier | undefined>(
          (acc, item) => (acc ? ts.createQualifiedName(acc, item) : ts.createIdentifier(item)),
          undefined,
        )
      : name;

    return ts.createTypeReferenceNode(fullName ?? '', types);
  },

  Tuple: (types: ts.TypeNode[]): ts.TupleTypeNode => ts.createTupleTypeNode(types),

  TypeExpression: ({
    name,
    types,
  }: {
    name: string | ts.Identifier;
    types?: ts.TypeNode[];
  }): ts.ExpressionWithTypeArguments =>
    ts.createExpressionWithTypeArguments(
      types,
      typeof name === 'string' ? ts.createIdentifier(name) : name,
    ),

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
      ts.createTypeAliasDeclaration(
        undefined,
        Type.Export(isExport, isDefault),
        name,
        typeArgs,
        type,
      ),
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
      ts.createInterfaceDeclaration(
        undefined,
        Type.Export(isExport, isDefault),
        name,
        typeArgs,
        ext
          ? [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, ext.map(Type.TypeExpression))]
          : undefined,
        [...props, ...(index ? [index] : [])],
      ),
    ),
};
