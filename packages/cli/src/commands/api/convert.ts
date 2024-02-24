import { compile, Schema } from '@laminarjs/json-schema';
import {
  document,
  Document,
  mapWithContext,
  Node,
  printDocument,
  Type,
  withIdentifier,
  withImports,
} from '@laminarjs/ts-compose';
import { oas31 } from 'openapi3-ts';
import ts from 'typescript';
import { convertSchema } from '../../convert-schema';
import {
  AstContext,
  isSchemaObject,
  isResponseObject,
  getReferencedObject,
  isRequestBodyObject,
  isParameterObject,
  isMediaTypeObject,
  isPathItemObject,
} from '../../traverse';
import { findMediaType } from '../../helpers';

interface AstParameters {
  in: {
    query?: ts.TypeElement[];
    headers?: ts.TypeElement[];
    path?: ts.TypeElement[];
    cookies?: ts.TypeElement[];
  };
  context: AstContext;
}

const title = (str: string): string => str.replace(/^./, (first) => first.toUpperCase());
const documentation = (summary?: string, description?: string): string | undefined =>
  summary || description ? [summary, description].filter((item) => item !== undefined).join('\n') : undefined;
const cleanIdentifierName = (str: string): string => str.replace(/[^0-9a-zA-Z_$]+/g, '');

const pathToIdentifier = (path: string): string => path.split('/').map(cleanIdentifierName).map(title).join('');

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
  parameters: (oas31.ParameterObject | oas31.ReferenceObject)[],
): Document<ts.TypeLiteralNode, AstContext> => {
  const astParams = parameters.reduce<AstParameters>(
    (node, paramOrRef) => {
      const param = getReferencedObject(paramOrRef, isParameterObject, 'parameter', node.context);
      const schema = getReferencedObject(param.schema, isSchemaObject, 'schema', node.context);
      const paramNode = param.schema ? convertSchema(node.context, param.schema) : document(node.context, Type.Any);
      const params = node.in[toParamLocation(param.in)] ?? [];
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
              isOptional: !param.required && schema?.default === undefined,
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

const convertSecuritySchemas = (
  context: AstContext,
  securitySchemas: {
    [securityScheme: string]: oas31.SecuritySchemeObject | oas31.ReferenceObject;
  },
): Document<ts.PropertySignature, AstContext> => {
  const security = mapWithContext(context, Object.keys(securitySchemas), (securityContext, name) => {
    return document(
      securityContext,
      Type.Prop({
        name,
        type: Type.Referance('OapiSecurityResolver', [Type.Referance('R'), Type.Referance('TAuthInfo')]),
      }),
    );
  });

  return document(security.context, Type.Prop({ name: 'security', type: Type.TypeLiteral({ props: security.items }) }));
};

/**
 * If root repsponse is string, we allow it to be readable stream as well
 */
const convertResponse = (
  context: AstContext,
  schemaOrRef?: oas31.SchemaObject | oas31.ReferenceObject,
): Document<ts.TypeNode | undefined, AstContext> => {
  if (schemaOrRef) {
    const schema = getReferencedObject(schemaOrRef, isSchemaObject, 'schema', context);
    const responseDocument = convertSchema(context, schemaOrRef);
    if (schema.type === 'string') {
      return document(
        withImports(responseDocument.context, { module: 'stream', named: [{ name: 'Readable' }] }),
        Type.Union([responseDocument.type, Type.Referance('Readable'), Type.Referance('Buffer')]),
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
  responses: oas31.ResponsesObject,
): Document<ts.TypeReferenceNode, AstContext> => {
  const responseEntries = Object.entries<oas31.ResponseObject | oas31.ReferenceObject>(responses);

  const params = mapWithContext(context, responseEntries, (responseContext, [status, responseOrRef]) => {
    const response = getReferencedObject(responseOrRef, isResponseObject, 'response', responseContext);
    const responseMediaTypes = Object.entries<oas31.MediaTypeObject | oas31.ReferenceObject>(
      response.content ?? { '*': {} },
    );

    const { items, context: mediaTypesContext } = mapWithContext(
      responseContext,
      responseMediaTypes,
      (mediaTypeContext, [type, mediaTypeOrRef]) => {
        const mediaType = getReferencedObject(mediaTypeOrRef, isMediaTypeObject, 'media-type', mediaTypeContext);
        const typeString = type.includes('*') ? Type.String : Type.Literal(type);
        const typeStatus = status === 'default' ? Type.Number : Type.Literal(Number(status));

        const typeSchema = convertResponse(mediaTypeContext, mediaType.schema);

        const typeContext = withImports(typeSchema.context, {
          module: '@laminarjs/laminar',
          named: [{ name: 'ResponseOapi' }],
        });

        return document(
          typeContext,
          Type.Referance('ResponseOapi', [typeSchema.type ?? Type.Unknown, typeStatus, typeString]),
        );
      },
    );
    return document(mediaTypesContext, items);
  });

  const responseTypes = params.items.reduce((acc, item) => [...acc, ...item]);

  return responseTypes.length
    ? document(
        withIdentifier(params.context, Type.Alias({ name, type: Type.Union(responseTypes), isExport: true })),
        Type.Referance(name),
      )
    : document(
        withImports(context, { module: '@laminarjs/laminar', named: [{ name: 'ResponseOapi' }] }),
        Type.Referance('ResponseOapi'),
      );
};

const convertRequestBody = (
  context: AstContext,
  requestBodyOrRef: oas31.RequestBodyObject | oas31.ReferenceObject,
): Document<ts.TypeLiteralNode, AstContext> => {
  const requestBody = getReferencedObject(requestBodyOrRef, isRequestBodyObject, 'request-body', context);
  const schema =
    findMediaType('application/json', requestBody.content)?.schema ??
    requestBody.content['application/x-www-form-urlencoded']?.schema ??
    requestBody.content['multipart/form-data']?.schema ??
    {};
  const node = schema ? convertSchema(context, schema) : document(context, Type.Any);
  return document(
    node.context,
    Type.TypeLiteral({
      props: [Type.Prop({ name: 'body', type: node.type, isOptional: !requestBody.required })],
    }),
  );
};

export const convertOapi = (context: AstContext, api: oas31.OpenAPIObject): Document<ts.Node, AstContext> => {
  const paths = mapWithContext(
    context,
    Object.entries<oas31.PathItemObject>(api?.paths ?? []),
    (pathContext, [path, pathApiOrRef]) => {
      const { parameters, description, summary, servers, $ref, ...pathApi } = getReferencedObject(
        pathApiOrRef,
        isPathItemObject,
        'path',
        pathContext,
      );

      const methods = mapWithContext(
        pathContext,
        Object.entries<oas31.OperationObject>(pathApi),
        (methodContextOriginal, [method, operation]) => {
          const methodContext = { ...methodContextOriginal, convertDates: true };
          const astParams =
            operation.parameters || parameters
              ? convertParameters(methodContext, [...(parameters ?? []), ...(operation.parameters ?? [])])
              : document(methodContext, Type.TypeLiteral());

          const astRequestBody = operation.requestBody
            ? convertRequestBody(astParams.context, operation.requestBody)
            : document(astParams.context, Type.TypeLiteral());

          const identifier = pathToIdentifier(path) + title(method);
          const requestIdentifier = 'Request' + identifier;
          const responseIdentifier = 'Response' + identifier;
          const pathIdentifier = 'Path' + identifier;
          const doc = documentation(operation.summary || summary, operation.description || description);
          const security = operation.security || api.security;

          const requestProps = astParams.type.members
            .concat(astRequestBody.type.members)
            .concat(security ? Type.Prop({ name: 'authInfo', type: Type.Referance('TAuthInfo') }) : []);

          const requestInterface = requestProps.length
            ? Type.Interface({
                name: requestIdentifier,
                isExport: true,
                jsDoc: doc,
                typeArgs: security ? [Type.TypeArg({ name: 'TAuthInfo' })] : undefined,
                ext: [{ name: 'OapiContext' }],
                props: requestProps,
              })
            : undefined;

          const responseAst = convertResponses(
            { ...astRequestBody.context, convertDates: false },
            responseIdentifier,
            operation.responses,
          );

          const pathType = Type.Alias({
            name: pathIdentifier,
            isExport: true,
            jsDoc: operation.description,
            typeArgs: [
              Type.TypeArg({
                name: 'R',
                ext: Type.Referance('Empty'),
                defaultType: Type.Referance('Empty'),
              }),
              ...(security
                ? [
                    Type.TypeArg({
                      name: 'TAuthInfo',
                      ext: Type.Referance('OapiAuthInfo'),
                      defaultType: Type.Referance('OapiAuthInfo'),
                    }),
                  ]
                : []),
            ],
            type: Type.Arrow({
              args: [
                Type.Param({
                  name: 'req',
                  type: Type.Intersection([
                    ...(requestInterface
                      ? [Type.Referance(requestIdentifier, security ? [Type.Referance('TAuthInfo')] : undefined)]
                      : [Type.Referance('OapiContext')]),
                    Type.Referance('R'),
                  ]),
                }),
              ],
              ret: Type.Referance('Promise', [responseAst.type]),
            }),
          });

          const methodSignature = Type.Prop({
            name: method,
            type: Type.Referance(pathIdentifier, [
              Type.Referance('R'),
              ...(security ? [Type.Referance('TAuthInfo')] : []),
            ]),
            jsDoc: operation.description,
          });

          return document(
            withIdentifier(
              requestInterface ? withIdentifier(responseAst.context, requestInterface) : responseAst.context,
              pathType,
            ),
            methodSignature,
          );
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

  const security = api.components?.securitySchemes
    ? convertSecuritySchemas(paths.context, api.components?.securitySchemes)
    : undefined;

  const finalContext = security?.context ?? paths.context;

  const typeArgs = [
    Type.TypeArg({
      name: 'R',
      ext: Type.Referance('Empty'),
      defaultType: Type.Referance('Empty'),
    }),
    ...(security
      ? [
          Type.TypeArg({
            name: 'TAuthInfo',
            ext: Type.Referance('OapiAuthInfo'),
            defaultType: Type.Referance('OapiAuthInfo'),
          }),
        ]
      : []),
  ];

  return document(
    withIdentifier(
      withImports(finalContext, {
        module: '@laminarjs/laminar',
        named: [
          { name: 'OapiContext' },
          { name: 'OapiConfig' },
          { name: 'Empty' },
          { name: 'HttpListener' },
          { name: 'openApi' },
          ...(security ? [{ name: 'OapiSecurityResolver' }, { name: 'OapiAuthInfo' }] : []),
        ],
      }),
      Type.Interface({
        name: 'Config',
        isExport: true,
        ext: [
          {
            name: 'OapiConfig',
            types: [Type.Referance('R')],
          },
        ],
        typeArgs,
        props: [
          Type.Prop({ name: 'paths', type: Type.TypeLiteral({ props: paths.items }) }),
          ...(security ? [security.type] : []),
        ],
      }),
    ),
    Node.Const({
      name: 'openApiTyped',
      isExport: true,
      value: Node.Arrow({
        typeArgs,
        args: [
          Type.Param({
            name: 'config',
            type: Type.Referance('Config', [Type.Referance('R'), ...(security ? [Type.Referance('TAuthInfo')] : [])]),
          }),
        ],
        ret: Type.Referance('Promise', [Type.Referance('HttpListener', [Type.Referance('R')])]),
        body: Node.Call({
          expression: Node.Identifier('openApi'),
          args: [Node.Identifier('config')],
        }),
      }),
    }),
  );
};

export const oapiTs = async (api: Schema | string): Promise<string> => {
  const { schema, refs } = await compile(api);
  return printDocument(
    convertOapi(
      { root: schema as oas31.OpenAPIObject & { [index: string]: unknown }, refs },
      schema as oas31.OpenAPIObject & { [index: string]: unknown },
    ),
  );
};
