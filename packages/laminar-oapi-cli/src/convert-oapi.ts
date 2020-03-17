import {
  document,
  Document,
  mapWithContext,
  Type,
  withIdentifier,
  withImports,
} from '@ovotech/ts-compose';
import {
  OpenAPIObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from 'openapi3-ts';
import * as ts from 'typescript';
import { convertSchema } from './convert-schema';
import {
  AstContext,
  isSchemaObject,
  isResponseObject,
  getReferencedObject,
  isRequestBodyObject,
  isParameterObject,
} from './traverse';

interface AstParameters {
  in: {
    query?: ts.TypeElement[];
    headers?: ts.TypeElement[];
    path?: ts.TypeElement[];
    cookies?: ts.TypeElement[];
  };
  context: AstContext;
}

const title = (str: string): string => str.replace(/^./, first => first.toUpperCase());
const documentation = (summary?: string, description?: string): string | undefined =>
  summary || description
    ? [summary, description].filter(item => item !== undefined).join('\n')
    : undefined;
const cleanIdentifierName = (str: string): string => str.replace(/[^0-9a-zA-Z_$]+/g, '');

const pathToIdentifier = (path: string): string =>
  'T' +
  path
    .split('/')
    .map(cleanIdentifierName)
    .map(title)
    .join('');

const toParamLocation = (
  location: 'header' | 'cookie' | 'path' | 'query',
): 'headers' | 'cookies' | 'path' | 'query' => {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
};

const toParamName = (location: 'header' | 'cookie' | 'path' | 'query', name: string): string =>
  location === 'header' ? name.toLowerCase() : name;

const convertParameters = (
  context: AstContext,
  parameters: (ParameterObject | ReferenceObject)[],
): Document<ts.TypeLiteralNode, AstContext> => {
  const astParams = parameters.reduce<AstParameters>(
    (node, paramOrRef) => {
      const param = getReferencedObject(paramOrRef, isParameterObject, node.context);
      const paramNode = param.schema
        ? convertSchema(node.context, param.schema)
        : document(node.context, Type.Any);
      const params = node.in[toParamLocation(param.in)] || [];
      return {
        context: paramNode.context,
        in: {
          ...node.in,
          [toParamLocation(param.in)]: [
            ...params,
            Type.Prop({
              name: toParamName(param.in, param.name),
              jsDoc: documentation(param.description),
              type: paramNode.type,
              isOptional: !param.required,
            }),
          ],
        },
      };
    },
    { in: {}, context },
  );

  return {
    type: Type.TypeLiteral({
      props: Object.entries(astParams.in).map(([name, items]) =>
        Type.Prop({ name, type: Type.TypeLiteral({ props: items }) }),
      ),
    }),

    context: astParams.context,
  };
};

/**
 * If root repsponse is string, we allow it to be readable stream as well
 */
const convertResponse = (
  context: AstContext,
  schemaOrRef?: SchemaObject | ReferenceObject,
): Document<ts.TypeNode | undefined, AstContext> => {
  if (schemaOrRef) {
    const schema = getReferencedObject(schemaOrRef, isSchemaObject, context);
    const responseDocument = convertSchema(context, schemaOrRef);
    if (schema.type === 'string') {
      return document(
        withImports(responseDocument.context, { module: 'stream', named: [{ name: 'Readable' }] }),
        Type.Union([responseDocument.type, Type.Referance('Readable')]),
      );
    } else {
      return responseDocument;
    }
  } else {
    return document(context, undefined);
  }
};

const convertResponses = (
  context: AstContext,
  name: string,
  responses: ResponsesObject,
): Document<ts.TypeReferenceNode, AstContext> => {
  const responseEntries = Object.values<ResponseObject | ReferenceObject>(responses);

  const params = mapWithContext(context, responseEntries, (responseContext, responseOrRef) => {
    const response = getReferencedObject(responseOrRef, isResponseObject, responseContext);
    const schema =
      response?.content?.['application/json']?.schema ?? response?.content?.['*/*']?.schema;

    const node = convertResponse(responseContext, schema);

    const nodeContext = withImports(node.context, {
      module: '@ovotech/laminar',
      named: [{ name: 'LaminarResponse' }],
    });

    if (node.type !== undefined) {
      return document(nodeContext, [Type.Referance('LaminarResponse', [node.type]), node.type]);
    } else {
      return document(nodeContext, [Type.Referance('LaminarResponse')]);
    }
  });

  const responseTypes = params.items.reduce((acc, item) => [...acc, ...item]);

  return responseTypes.length
    ? document(
        withIdentifier(
          params.context,
          Type.Alias({
            name,
            type: Type.Union([
              ...responseTypes,
              Type.Referance('Promise', [Type.Union(responseTypes)]),
            ]),
            isExport: true,
          }),
        ),
        Type.Referance(name),
      )
    : document(
        withImports(context, { module: '@ovotech/laminar', named: [{ name: 'ResolverResponse' }] }),
        Type.Referance('ResolverResponse'),
      );
};

const convertRequestBody = (
  context: AstContext,
  requestBodyOrRef: RequestBodyObject | ReferenceObject,
): Document<ts.TypeLiteralNode, AstContext> => {
  const requestBody = getReferencedObject(requestBodyOrRef, isRequestBodyObject, context);
  const schema = requestBody.content['application/json']
    ? requestBody.content['application/json'].schema
    : {};
  const node = schema ? convertSchema(context, schema) : document(context, Type.Any);
  return document(
    node.context,
    Type.TypeLiteral({
      props: [Type.Prop({ name: 'body', type: node.type, isOptional: !requestBody.required })],
    }),
  );
};

export const convertOapi = (
  context: AstContext,
  api: OpenAPIObject,
): Document<ts.InterfaceDeclaration, AstContext> => {
  const paths = mapWithContext(
    context,
    Object.entries<PathItemObject>(api.paths),
    (pathContext, [path, pathApiOrRef]) => {
      const { parameters, description, summary, ...methodsApiOrRef } = pathApiOrRef;
      const pathApi = getReferencedObject(methodsApiOrRef, isSchemaObject, context);

      const methods = mapWithContext(
        pathContext,
        Object.entries(pathApi),
        (methodContext, [method, operation]) => {
          const astParams =
            operation.parameters || parameters
              ? convertParameters(methodContext, [
                  ...(parameters ?? []),
                  ...(operation.parameters ?? []),
                ])
              : document(methodContext, Type.TypeLiteral());

          const astRequestBody = operation.requestBody
            ? convertRequestBody(astParams.context, operation.requestBody)
            : document(methodContext, Type.TypeLiteral());

          const identifier = pathToIdentifier(path) + title(method);
          const contextIdentifier = identifier + 'Context';
          const responseIdentifier = identifier + 'Response';
          const doc = documentation(
            operation.summary || summary,
            operation.description || description,
          );
          const contextInterface = Type.Interface({
            name: contextIdentifier,
            isExport: true,
            jsDoc: doc,
            ext: [{ name: 'Context' }, { name: 'OapiContext' }],
            props: astParams.type.members.concat(astRequestBody.type.members),
          });

          const responseAst = convertResponses(
            astRequestBody.context,
            responseIdentifier,
            operation.responses,
          );

          const methodCall = Type.Arrow(
            [
              Type.Param({
                name: 'context',
                type: Type.Intersection([Type.Referance(contextIdentifier), Type.Referance('C')]),
              }),
            ],
            responseAst.type,
          );

          const methodSignature = Type.Prop({
            name: method,
            type: methodCall,
            jsDoc: operation.description,
          });

          return document(withIdentifier(responseAst.context, contextInterface), methodSignature);
        },
      );

      return document(
        methods.context,
        Type.Prop({
          name: Type.LiteralString(path),
          type: Type.TypeLiteral({ props: methods.items }),
        }),
      );
    },
  );

  return document(
    withImports(
      withImports(paths.context, {
        module: '@ovotech/laminar-oapi',
        named: [
          { name: 'OapiContext' },
          { name: 'OapiConfig' },
          ...(api.components && api.components.securitySchemes
            ? [{ name: 'OapiSecurityResolver' }]
            : []),
        ],
      }),
      { module: '@ovotech/laminar', named: [{ name: 'Context' }] },
    ),
    Type.Interface({
      name: 'Config',
      isExport: true,
      ext: [{ name: 'OapiConfig', types: [Type.Referance('C')] }],
      typeArgs: [
        Type.TypeArg({
          name: 'C',
          ext: Type.TypeLiteral(),
          defaultType: Type.TypeLiteral(),
        }),
      ],
      props: [
        Type.Prop({ name: 'paths', type: Type.TypeLiteral({ props: paths.items }) }),
        ...(api.components && api.components.securitySchemes
          ? [
              Type.Prop({
                name: 'security',
                type: Type.TypeLiteral({
                  props: Object.keys(api.components.securitySchemes).map(scheme =>
                    Type.Prop({
                      name: scheme,
                      type: Type.Referance('OapiSecurityResolver', [Type.Referance('C')]),
                    }),
                  ),
                }),
              }),
            ]
          : []),
      ],
    }),
  );
};
