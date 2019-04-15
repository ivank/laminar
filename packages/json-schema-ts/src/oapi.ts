import { resolveRefs } from '@ovotech/json-refs';
import { JsonSchema } from '@ovotech/json-schema';
import {
  OpenAPIObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
} from 'openapi3-ts';
import * as ts from 'typescript';
import { printAstNode } from '.';
import * as t from './ast';
import { astTypeLiteral, convertSchema, withEntry, astAny, astUnion } from './convert';
import { AstContext, AstNode } from './types';

export const isRef = (item: any): item is ReferenceObject =>
  typeof item === 'object' && '$ref' in item && typeof item.$ref === 'string';
export const withRef = <T = any>(item: T | ReferenceObject, context: AstContext): T =>
  isRef(item) ? context.refs[item.$ref] : item;

type Method = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';
const methodNames: Method[] = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

interface AstParameters {
  in: {
    query?: readonly ts.PropertySignature[];
    header?: readonly ts.PropertySignature[];
    path?: readonly ts.PropertySignature[];
    cookie?: readonly ts.PropertySignature[];
  };
  context: AstContext;
}

export const title = (str: string) => str.replace(/^./, first => first.toUpperCase());
export const cleanIdentifierName = (str: string) => str.replace(/[^0-9a-zA-Z_$]+/g, '');

export const pathToIdentifier = (path: string) =>
  path
    .split('/')
    .map(cleanIdentifierName)
    .map(title)
    .join('');

export const convertParameters = (
  parameters: Array<ParameterObject | ReferenceObject>,
  context: AstContext,
): AstNode<ts.TypeLiteralNode> => {
  const astParams = parameters.reduce<AstParameters>(
    (node, paramOrRef) => {
      const param = withRef(paramOrRef, context);
      const paramNode = convertSchema(param.schema as JsonSchema, node.context);
      const current = node.in[param.in] || [];
      return {
        context: paramNode.context,
        in: {
          ...node.in,
          [param.in]: [...current, t.prop(param.name, !param.required, paramNode.type)],
        },
      };
    },
    { in: {}, context },
  );

  return {
    type: t.typeLiteral(
      Object.entries(astParams.in).map(([name, items]) =>
        t.prop(name, false, t.typeLiteral(items!)),
      ),
    ),
    context: astParams.context,
  };
};

export const convertResponse = (key: string, response: ResponseObject, context: AstContext) => {
  if (
    response.content &&
    response.content['application/json'] &&
    response.content['application/json'].schema
  ) {
    const node = convertSchema(response.content['application/json'].schema as JsonSchema, context);
    const nodeType =
      key === '200'
        ? t.unionType([node.type, t.refType('Response', [t.literalType(Number(key)), node.type])])
        : key === 'default'
        ? t.unionType([node.type, t.refType('Response', [t.anyType(), node.type])])
        : t.refType('Response', [t.literalType(Number(key)), node.type]);

    return { type: nodeType, context: node.context };
  } else {
    return null;
  }
};

export const convertResponses = (
  identifier: string,
  responses: ResponsesObject,
  context: AstContext,
) => {
  const responseEntries = Object.entries<ResponseObject | ReferenceObject>(responses);

  const params = responseEntries.reduce<AstNode<ts.UnionTypeNode>>(
    (responseNode, [key, responseOrRef]) => {
      const response = withRef(responseOrRef, responseNode.context);
      const node = convertResponse(key, response, responseNode.context);

      return node
        ? astUnion(responseNode.type.types.concat([node.type]), node.context)
        : responseNode;
    },
    { type: t.unionType([]), context },
  );

  return params.type.types.length
    ? {
        type: t.refType(identifier),
        context: withEntry(identifier, t.aliasType(identifier, params.type), params.context),
      }
    : astAny(context);
};

export const convertRequestBody = (
  requestBodyOrRef: RequestBodyObject | ReferenceObject,
  context: AstContext,
): AstNode<ts.TypeLiteralNode> => {
  const requestBody = withRef(requestBodyOrRef, context);
  const schema = requestBody.content['application/json']
    ? requestBody.content['application/json'].schema
    : {};
  const node = convertSchema(schema as JsonSchema, context);
  return astTypeLiteral([t.prop('body', !requestBody.required, node.type)], node.context);
};

export const convert = async (api: OpenAPIObject) => {
  const { schema, refs } = await resolveRefs(api);
  const context = { root: schema, refs, registry: {} };

  const p = Object.entries<PathItemObject>(schema.paths).reduce<AstNode<ts.TypeLiteralNode>>(
    (pathsNode, [path, pathApiOrRef]) => {
      const pathApi = withRef(pathApiOrRef, context);

      const methods = methodNames.reduce<AstNode<ts.TypeLiteralNode>>(
        (methodsNode, method) => {
          const operation = pathApi[method];
          if (operation) {
            const astParams = operation.parameters
              ? convertParameters(operation.parameters, methodsNode.context)
              : astTypeLiteral([], methodsNode.context);

            const astRequestBody = operation.requestBody
              ? convertRequestBody(operation.requestBody, astParams.context)
              : astTypeLiteral([], astParams.context);

            const identifier = pathToIdentifier(path) + title(method);
            const contextIdentifier = identifier + 'Context';
            const responseIdentifier = identifier + 'Response';
            const contextContent = t.interfaceType(
              contextIdentifier,
              astParams.type.members.concat(astRequestBody.type.members),
              ['Context'],
            );

            const responseAst = convertResponses(
              responseIdentifier,
              operation.responses,
              astRequestBody.context,
            );

            const methodCall = t.func(
              [t.param('context', false, t.refType(contextIdentifier))],
              responseAst.type,
            );

            return astTypeLiteral(
              methodsNode.type.members.concat([t.prop(method, false, methodCall)]),
              withEntry(contextIdentifier, contextContent, responseAst.context),
            );
          } else {
            return methodsNode;
          }
        },
        { type: t.typeLiteral([]), context: pathsNode.context },
      );

      return {
        type: t.typeLiteral(pathsNode.type.members.concat([t.prop(path, false, methods.type)])),
        context: methods.context,
      };
    },
    { type: t.typeLiteral([]), context },
  );

  return printAstNode(p);
};
