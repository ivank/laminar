import { document, Document, mapWithContext, Type, Node, withImports, withIdentifier } from '@laminarjs/ts-compose';
import { oas31 } from 'openapi3-ts';
import ts from 'typescript';
import { convertSchema } from '../../convert-schema';
import { findMediaType } from '../../helpers';
import {
  AstContext,
  isSchemaObject,
  isResponseObject,
  getReferencedObject,
  isRequestBodyObject,
  isParameterObject,
} from '../../traverse';

const isTypeNode = (item: ts.TypeNode | undefined): item is ts.TypeNode => item !== undefined;
const isStatusOk = (status: string): boolean => Number(status) >= 200 && Number(status) <= 300;
const documentation = (summary?: string, description?: string): string | undefined =>
  summary || description ? [summary, description].filter((item) => item !== undefined).join('\n') : undefined;

const title = (str: string): string => str.replace(/^./, (first) => first.toUpperCase());
const cleanIdentifierName = (str: string): string => str.replace(/[^0-9a-zA-Z_$]+/g, '');
const pathToIdentifier = (method: string, path: string): string =>
  title(method) + path.split('/').map(cleanIdentifierName).map(title).join('');

const pathRegEx = /\{[^\}]+\}/g;

const pathToImplicitParams = (path: string): oas31.ParameterObject[] =>
  path.match(pathRegEx)?.map((name) => ({
    in: 'path',
    name: name.slice(1, -1),
    required: true,
    schema: { type: 'string' },
  })) ?? [];

const convertPathParams = (
  context: AstContext,
  path: string,
  parameters: oas31.ParameterObject[],
): { items: { name: string; type: ts.TypeNode }[]; context: AstContext } => {
  const implicitParams = pathToImplicitParams(path).map(
    (item) => parameters.find((param) => param.in === 'path' && param.name === item.name) ?? item,
  );

  return mapWithContext(context, implicitParams, (context, param) => {
    const astParams = param.schema ? convertSchema(context, param.schema) : document(context, Type.Unknown);

    return document(astParams?.context ?? context, {
      name: param.name,
      type: param.required ? astParams.type : Type.Union([astParams.type, Type.Undefined]),
    });
  });
};

const convertConfigProps = (
  context: AstContext,
  parameters: oas31.ParameterObject[],
): { items: ts.PropertySignature[]; context: AstContext } => {
  return mapWithContext(context, parameters, (context, param) => {
    const astParams = param.schema
      ? convertSchema({ ...context, optionalDefaults: true }, param.schema)
      : document(context, Type.Unknown);

    return document(
      { ...astParams.context, optionalDefaults: context.optionalDefaults },
      Type.Prop({
        name: param.in === 'header' ? param.name.toLowerCase() : param.name,
        type: astParams.type,
        jsDoc: documentation(param.description),
        isOptional: !param.required,
      }),
    );
  });
};

const convertConfigParams = (
  context: AstContext,
  parameters: oas31.ParameterObject[],
): Document<ts.PropertySignature[], AstContext> => {
  const headerItems = convertConfigProps(
    context,
    parameters.filter((param) => param.in === 'header'),
  );
  const queryItems = convertConfigProps(
    headerItems.context,
    parameters.filter((param) => param.in === 'query'),
  );

  return document(queryItems.context, [
    ...(headerItems.items.length
      ? [
          Type.Prop({
            name: 'headers',
            type: Type.TypeLiteral({ props: headerItems.items }),
            isOptional: true,
          }),
        ]
      : []),
    ...(queryItems.items.length
      ? [
          Type.Prop({
            name: 'params',
            type: Type.TypeLiteral({ props: queryItems.items }),
            isOptional: true,
          }),
        ]
      : []),
  ]);
};

const convertResponses = (
  context: AstContext,
  responses: oas31.ResponsesObject,
): Document<ts.TypeNode | undefined, AstContext> => {
  const responseEntries = Object.entries<oas31.ResponseObject | oas31.ReferenceObject>(responses)
    .filter(([status]) => status === 'default' || isStatusOk(status))
    .map(([, response]) => response);

  const astResponses = mapWithContext(context, responseEntries, (responseContext, responseOrRef) => {
    const response = getReferencedObject(responseOrRef, isResponseObject, 'response', responseContext);
    const schema = findMediaType('application/json', response?.content)?.schema;

    return schema ? convertSchema(responseContext, schema) : document(responseContext, undefined);
  });

  const responseTypes = astResponses.items.filter(isTypeNode);

  return document(
    astResponses.context,
    responseTypes.length === 0 ? undefined : responseTypes.length == 1 ? responseTypes[0] : Type.Union(responseTypes),
  );
};

const convertRequestBody = (
  context: AstContext,
  requestBodyOrRef?: oas31.RequestBodyObject | oas31.ReferenceObject,
): Document<{ isOptional: boolean; body: ts.TypeNode }, AstContext> => {
  const requestBody = requestBodyOrRef
    ? getReferencedObject(requestBodyOrRef, isRequestBodyObject, 'request-body', context)
    : undefined;
  const schema = findMediaType('application/json', requestBody?.content)?.schema;
  const convertedSchema = schema ? convertSchema(context, schema) : document(context, Type.Unknown);
  return document(convertedSchema.context, {
    isOptional: !requestBody?.required,
    body: convertedSchema.type,
  });
};

export const convertOapi = (context: AstContext, api: oas31.OpenAPIObject): Document<ts.Node, AstContext> => {
  const paths = mapWithContext(
    context,
    Object.entries<oas31.PathItemObject>(api?.paths ?? []),
    (pathContext, [path, pathApiOrRef]) => {
      const { parameters, description, summary, ...methodsApiOrRef } = pathApiOrRef;
      const pathApi = getReferencedObject(methodsApiOrRef, isSchemaObject, 'schema', context);

      const methods = mapWithContext(pathContext, Object.entries(pathApi), (methodContext, [method, operation]) => {
        const combinedParameters = [...(parameters ?? []), ...(operation.parameters ?? [])].map((item) =>
          getReferencedObject<oas31.ParameterObject>(item, isParameterObject, 'parameter', methodContext),
        );

        const requestName = `${method.toUpperCase()} ${path}`;
        const pathItems = convertPathParams(methodContext, path, combinedParameters);
        const configParams = convertConfigParams(pathItems.context, combinedParameters);

        const astRequestBody = convertRequestBody(configParams.context, operation.requestBody);

        const doc = documentation(operation.summary || summary, operation.description || description);

        const responseAst = convertResponses(astRequestBody.context, operation.responses);

        const hasData = method === 'post' || method === 'put' || method === 'patch';
        const configDataIdentifier = pathToIdentifier(method, path);
        const configDataContext = configParams.type.length
          ? withIdentifier(
              responseAst.context,
              Type.Interface({
                name: configDataIdentifier,
                props: configParams.type,
                isExport: true,
              }),
            )
          : responseAst.context;

        const node = Node.ObjectLiteralProp({
          key: requestName,
          jsDoc: doc,
          value: Node.Arrow({
            args: [
              ...pathItems.items.map(({ name }) => Type.Param({ name })),
              ...(hasData ? [Type.Param({ name: 'data' })] : []),
              Type.Param({ name: 'config' }),
            ],
            body: Node.Call({
              expression: Node.Identifier(`api.${method.toLowerCase()}`),
              typeArgs: responseAst.type ? [responseAst.type] : undefined,
              args: [
                Node.TemplateString(path.replace(/\{/g, '${')),
                ...(hasData ? [Node.Identifier('data')] : []),
                Node.Identifier('config'),
              ],
            }),
          }),
        });

        const type = Type.Prop({
          name: requestName,
          jsDoc: doc,
          type: Type.Arrow({
            args: [
              ...pathItems.items.map(Type.Param),
              ...(hasData
                ? [
                    Type.Param({
                      name: 'data',
                      type: astRequestBody.type.body,
                      isOptional: astRequestBody.type.isOptional,
                    }),
                  ]
                : []),
              Type.Param({
                name: 'config',
                isOptional: true,
                type: Type.Intersection([
                  Type.Referance('AxiosRequestConfig'),
                  ...(configParams.type.length ? [Type.Referance(configDataIdentifier)] : []),
                ]),
              }),
            ],
            ret: Type.Referance('Promise', [
              Type.Referance('AxiosResponse', responseAst.type ? [responseAst.type] : undefined),
            ]),
          }),
        });

        return document(configDataContext, { node, type });
      });

      return document(methods.context, methods.items);
    },
  );

  const jsDoc = [
    api.info.title,
    api.info.version ? `\n\nVersion: ${api.info.version}` : '',
    api.info.description ? `\n\nDescription:\n${api.info.description}` : '',
  ].join('');

  const endpoints = Node.ObjectLiteral({
    multiline: true,
    props: paths.items
      .reduce<ts.PropertyAssignment[]>((all, path) => all.concat(path.map((item) => item.node)), [])
      .concat(Node.ObjectLiteralProp({ key: 'api', value: Node.Identifier('api') })),
  });

  return document(
    withIdentifier(
      withImports(paths.context, {
        module: 'axios',
        named: [{ name: 'AxiosRequestConfig' }, { name: 'AxiosInstance' }, { name: 'AxiosResponse' }],
      }),
      Type.Interface({
        name: 'AxiosOapiInstance',
        isExport: true,
        props: paths.items
          .reduce<ts.PropertySignature[]>((all, path) => all.concat(path.map((item) => item.type)), [])
          .concat([Type.Prop({ name: 'api', type: Type.Referance('AxiosInstance') })]),
      }),
    ),
    Node.Const({
      name: 'axiosOapi',
      isExport: true,
      jsDoc,
      value: Node.Arrow({
        args: [Type.Param({ name: 'api', type: Type.Referance('AxiosInstance') })],
        ret: Type.Referance('AxiosOapiInstance'),
        body: endpoints,
      }),
    }),
  );
};
