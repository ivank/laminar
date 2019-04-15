import * as ts from 'typescript';

export const anyType = () => ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

export const voidType = () => ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

export const nullType = () => ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword);

export const numberType = () => ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

export const stringType = () => ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);

export const arrayType = (type: ts.TypeNode) => ts.createArrayTypeNode(type);

export const objectType = () => ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);

export const booleanType = () => ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);

export const literalType = (value: string | number | boolean) =>
  ts.createLiteralTypeNode(ts.createLiteral(value) as ts.LiteralTypeNode['literal']);

export const unionType = (types: readonly ts.TypeNode[]) => ts.createUnionTypeNode(types);

export const refType = (name: string | ts.Identifier, typeArguments?: readonly ts.TypeNode[]) =>
  ts.createTypeReferenceNode(name, typeArguments);

export const intersectionType = (types: readonly ts.TypeNode[]) =>
  ts.createIntersectionTypeNode(types);

export const isLiteralType = (node: ts.TypeNode): node is ts.TypeLiteralNode =>
  ts.isTypeLiteralNode(node);

export const optionalToken = () => ts.createToken(ts.SyntaxKind.QuestionToken);

export const prop = (key: string, optional: boolean, type: ts.TypeNode) =>
  ts.createPropertySignature(
    undefined,
    key,
    optional ? optionalToken() : undefined,
    type,
    undefined,
  );

export const index = (optional: boolean, type: ts.TypeNode) =>
  ts.createIndexSignature(undefined, undefined, [param('key', optional, stringType())], type);

export const param = (key: string, optional: boolean, type: ts.TypeNode) =>
  ts.createParameter(
    undefined,
    undefined,
    undefined,
    key,
    optional ? optionalToken() : undefined,
    type,
    undefined,
  );

export const func = (params: ts.ParameterDeclaration[], returnType: ts.TypeNode) =>
  ts.createFunctionTypeNode(undefined, params, returnType);

export const typeLiteral = (members: readonly ts.TypeElement[]) =>
  ts.createTypeLiteralNode(members);

export const tupleType = (types: readonly ts.TypeNode[]) => ts.createTupleTypeNode(types);

export const interfaceType = (
  identifier: string | ts.Identifier,
  members: readonly ts.TypeElement[],
  heritage?: Array<string | ts.Identifier>,
) =>
  ts.createInterfaceDeclaration(
    undefined,
    undefined,
    identifier,
    undefined,
    heritage
      ? heritage.map(name =>
          ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.createExpressionWithTypeArguments(
              undefined,
              typeof name === 'string' ? ts.createIdentifier(name) : name,
            ),
          ]),
        )
      : undefined,
    members,
  );

export const aliasType = (identifier: string | ts.Identifier, type: ts.TypeNode) =>
  ts.createTypeAliasDeclaration(undefined, undefined, identifier, undefined, type);
