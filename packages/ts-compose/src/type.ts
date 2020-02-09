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

export const Any = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

export const Str = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);

export const Num = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

export const Null = ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword);

export const Bool = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);

export const Obj = ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);

export const Void = ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

export const Unknown = ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);

export const Never = ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);

export const TypeLiteral = ({
  props = [],
  index,
}: {
  props?: ts.TypeElement[];
  index?: ts.IndexSignatureDeclaration;
} = {}): ts.TypeLiteralNode => ts.createTypeLiteralNode([...props, ...(index ? [index] : [])]);

export const Arr = (type: ts.TypeNode): ts.ArrayTypeNode => ts.createArrayTypeNode(type);

export const Union = (types: ts.TypeNode[]): ts.UnionTypeNode => ts.createUnionTypeNode(types);

export const Intersection = (types: ts.TypeNode[]): ts.IntersectionTypeNode =>
  ts.createIntersectionTypeNode(types);

export const Literal = (value: unknown): ts.LiteralTypeNode | ts.KeywordTypeNode => {
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
};

export const LiteralString = (value: string): ts.StringLiteral => ts.createLiteral(value);

export const Arrow = (args: ts.ParameterDeclaration[], ret: ts.TypeNode): ts.FunctionTypeNode =>
  ts.createFunctionTypeNode(undefined, args, ret);

export const Optional = (isOptional?: boolean): ts.Token<ts.SyntaxKind.QuestionToken> | undefined =>
  isOptional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;

export const Public = (isPublic?: boolean): ts.Token<ts.SyntaxKind.PublicKeyword>[] =>
  isPublic ? [ts.createModifier(ts.SyntaxKind.PublicKeyword)] : [];

export const Readonly = (isReadonly?: boolean): ts.Token<ts.SyntaxKind.ReadonlyKeyword>[] =>
  isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : [];

export const Private = (isPrivate?: boolean): ts.Token<ts.SyntaxKind.PrivateKeyword>[] =>
  isPrivate ? [ts.createModifier(ts.SyntaxKind.PrivateKeyword)] : [];

export const Export = (isExport?: boolean): ts.Token<ts.SyntaxKind.ExportKeyword>[] =>
  isExport ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : [];

export const Protected = (isProtected?: boolean): ts.Token<ts.SyntaxKind.ProtectedKeyword>[] =>
  isProtected ? [ts.createModifier(ts.SyntaxKind.ProtectedKeyword)] : [];

export const Prop = ({
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
    ts.createPropertySignature(
      [
        ...Readonly(isReadonly),
        ...Public(isPublic),
        ...Private(isPrivate),
        ...Protected(isProtected),
      ],
      typeof name === 'string' && !isIdentifierString(name) ? ts.createStringLiteral(name) : name,
      Optional(isOptional),
      type,
      initializer,
    ),
    jsDoc,
  );

export const Param = ({
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
    Readonly(isReadonly),
    undefined,
    name,
    Optional(isOptional),
    type,
    undefined,
  );

export const TypeArg = ({
  name,
  ext,
  defaultType,
}: {
  name: string | ts.Identifier;
  ext?: ts.TypeNode;
  defaultType?: ts.TypeNode;
}): ts.TypeParameterDeclaration => ts.createTypeParameterDeclaration(name, ext, defaultType);

export const Index = ({
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
  ts.createIndexSignature(undefined, Readonly(isReadonly), [Param({ name, type: nameType })], type);

export const Ref = (name: string | ts.Identifier, types?: ts.TypeNode[]): ts.TypeReferenceNode =>
  ts.createTypeReferenceNode(name, types);

export const Tuple = (types: ts.TypeNode[]): ts.TupleTypeNode => ts.createTupleTypeNode(types);

export const TypeExpression = ({
  name,
  types,
}: {
  name: string | ts.Identifier;
  types?: ts.TypeNode[];
}): ts.ExpressionWithTypeArguments =>
  ts.createExpressionWithTypeArguments(
    types,
    typeof name === 'string' ? ts.createIdentifier(name) : name,
  );

export const Alias = ({
  name,
  type,
  typeArgs,
  isExport,
  jsDoc,
}: {
  name: string | ts.Identifier;
  type: ts.TypeNode;
  isExport?: boolean;
  typeArgs?: ts.TypeParameterDeclaration[];
  jsDoc?: string;
}): ts.TypeAliasDeclaration =>
  withJSDoc(
    ts.createTypeAliasDeclaration(undefined, Export(isExport), name, typeArgs, type),
    jsDoc,
  );

export interface InterfaceExtend {
  name: string;
  types?: ts.TypeNode[];
}

export const Interface = ({
  name,
  props = [],
  index,
  typeArgs,
  ext,
  isExport,
  jsDoc,
}: {
  name: string | ts.Identifier;
  props?: ts.TypeElement[];
  index?: ts.IndexSignatureDeclaration;
  typeArgs?: ts.TypeParameterDeclaration[];
  ext?: InterfaceExtend[];
  isExport?: boolean;
  jsDoc?: string;
}): ts.InterfaceDeclaration =>
  withJSDoc(
    ts.createInterfaceDeclaration(
      undefined,
      Export(isExport),
      name,
      typeArgs,
      ext
        ? [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, ext.map(TypeExpression))]
        : undefined,
      [...props, ...(index ? [index] : [])],
    ),
    jsDoc,
  );
