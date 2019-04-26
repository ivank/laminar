import * as ts from 'typescript';
import { withJSDoc } from './docs';

export const Any = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

export const Str = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);

export const Num = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

export const Null = ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword);

export const Bool = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);

export const Obj = ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);

export const Void = ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

export const TypeLiteral = ({
  props = [],
  index,
}: {
  props?: ts.TypeElement[];
  index?: ts.IndexSignatureDeclaration;
} = {}) => ts.createTypeLiteralNode([...props, ...(index ? [index] : [])]);

export const Arr = (type: ts.TypeNode) => ts.createArrayTypeNode(type);

export const Union = (types: ts.TypeNode[]) => ts.createUnionTypeNode(types);

export const Intersection = (types: ts.TypeNode[]) => ts.createIntersectionTypeNode(types);

export const Literal = (value: any) => {
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

export const LiteralString = (value: string) => ts.createLiteral(value);

export const Arrow = (args: ts.ParameterDeclaration[], ret: ts.TypeNode) =>
  ts.createFunctionTypeNode(undefined, args, ret);

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
}) =>
  withJSDoc(
    ts.createPropertySignature(
      [
        ...Readonly(isReadonly),
        ...Public(isPublic),
        ...Private(isPrivate),
        ...Protected(isProtected),
      ],
      name,
      Optional(isOptional),
      type,
      initializer,
    ),
    jsDoc,
  );

export const Optional = (isOptional?: boolean) =>
  isOptional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;

export const Public = (isPublic?: boolean) =>
  isPublic ? [ts.createModifier(ts.SyntaxKind.PublicKeyword)] : [];

export const Readonly = (isReadonly?: boolean) =>
  isReadonly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : [];

export const Private = (isPrivate?: boolean) =>
  isPrivate ? [ts.createModifier(ts.SyntaxKind.PrivateKeyword)] : [];

export const Export = (isExport?: boolean) =>
  isExport ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : [];

export const Protected = (isProtected?: boolean) =>
  isProtected ? [ts.createModifier(ts.SyntaxKind.ProtectedKeyword)] : [];

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
}) =>
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
  defaultType,
}: {
  name: string | ts.Identifier;
  defaultType?: ts.TypeNode;
}) => ts.createTypeParameterDeclaration(name, undefined, defaultType);

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
}) =>
  ts.createIndexSignature(undefined, Readonly(isReadonly), [Param({ name, type: nameType })], type);

export const Ref = (name: string | ts.Identifier, types?: ts.TypeNode[]) =>
  ts.createTypeReferenceNode(name, types);

export const Tuple = (types: ts.TypeNode[]) => ts.createTupleTypeNode(types);

export const TypeExpression = ({
  name,
  types,
}: {
  name: string | ts.Identifier;
  types?: ts.TypeNode[];
}) =>
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
}) =>
  withJSDoc(
    ts.createTypeAliasDeclaration(undefined, Export(isExport), name, typeArgs, type),
    jsDoc,
  );

export const Interface = ({
  name,
  props,
  index,
  typeArgs,
  ext,
  isExport,
  jsDoc,
}: {
  name: string | ts.Identifier;
  props: ts.TypeElement[];
  index?: ts.IndexSignatureDeclaration;
  typeArgs?: ts.TypeParameterDeclaration[];
  ext?: Array<{ name: string; types?: ts.TypeNode[] }>;
  isExport?: boolean;
  jsDoc?: string;
}) =>
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
