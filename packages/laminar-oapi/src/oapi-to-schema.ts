import { Schema } from '@ovotech/json-schema';
import { SecurityRequirementObject, SecuritySchemeObject, SchemaObject } from 'openapi3-ts';
import { toMatchPattern, title } from './helpers';
import { OapiResolverError } from './OapiResolverError';
import {
  ResolvedOpenAPIObject,
  ResolvedOperationObject,
  ResolvedParameterObject,
  ResolvedRequestBodyObject,
  ResolvedResponseObject,
  ResolvedPathItemObject,
} from './resolved-openapi-object';

export interface OperationSecurity {
  [schemeName: string]: {
    scopes: string[];
    scheme: SecuritySchemeObject;
  };
}
export interface OperationSchema {
  context: Schema;
  response: Schema;
  security?: SecurityRequirementObject[];
}

export interface PathsSchema {
  [path: string]: { [method: string]: OperationSchema };
}

const toParamLocation = (location: string): string => {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
};

const toParamName = (location: string, name: string): string =>
  location === 'header' ? name.toLowerCase() : name;

export const toParameterSchema = (param: ResolvedParameterObject): SchemaObject => {
  const name = toParamName(param.in, param.name);

  return {
    properties: {
      [toParamLocation(param.in)]: {
        ...(param.required ? { required: [name] } : {}),
        ...(param.schema ? { properties: { [name]: param.schema } } : {}),
      },
    },
  };
};

export const toRequestBodySchema = (
  requestBody: ResolvedRequestBodyObject,
): Record<string, unknown> => ({
  ...(requestBody.required ? { required: ['body'] } : {}),
  ...(requestBody.content
    ? {
        discriminator: { propertyName: 'headers' },
        oneOf: Object.entries(requestBody.content).map(([match, mediaType]) => ({
          properties: {
            headers: {
              type: 'object',
              required: ['content-type'],
              properties: {
                'content-type': { type: 'string', pattern: toMatchPattern(match) },
              },
            },
            body: mediaType.schema,
          },
        })),
      }
    : {}),
});

export const toSecuritySchema = (
  security: SecurityRequirementObject[],
  schemes: { [securityScheme: string]: SecuritySchemeObject },
): Record<string, unknown> => ({
  anyOf: security.map((item) => ({
    allOf: Object.entries(item).map(([name]) => {
      const scheme = schemes[name];

      if (!scheme) {
        throw new OapiResolverError(
          `Security scheme ${name} not defined in components.securitySchemes in the OpenApi Schema`,
        );
      }

      switch (scheme.type) {
        case 'http':
          return {
            properties: {
              headers: {
                ...(scheme.scheme
                  ? { properties: { authorization: { pattern: `^${title(scheme.scheme)}` } } }
                  : {}),
                required: ['authorization'],
              },
            },
          };
        case 'apiKey':
          return scheme.in && scheme.name
            ? {
                properties: {
                  [toParamLocation(scheme.in)]: { required: [scheme.name.toLowerCase()] },
                },
              }
            : {};
        default:
          return {};
      }
    }),
  })),
});

export const toRequestSchema = (
  { security: defaultSecurity, components }: ResolvedOpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: ResolvedOperationObject,
  {
    parameters: commonParameters,
  }: Pick<ResolvedPathItemObject, 'summary' | 'parameters' | 'description'>,
): Schema => {
  const security = operationSecurity || defaultSecurity;
  const securitySchemes = components && components.securitySchemes;
  const allParameters = [
    ...(parameters ? parameters : []),
    ...(commonParameters ? commonParameters : []),
  ];
  return {
    allOf: [
      ...allParameters.map(toParameterSchema),
      ...(requestBody ? [toRequestBodySchema(requestBody)] : []),
      ...(security && securitySchemes ? [toSecuritySchema(security, securitySchemes)] : []),
    ],
  };
};

export const toResponseSchema = ({
  responses,
}: ResolvedOperationObject): Record<string, unknown> => ({
  discriminator: { propertyName: 'status' },
  oneOf: Object.entries<ResolvedResponseObject>(responses).map(([status, response]) => ({
    type: 'object',
    properties: {
      status: status === 'default' ? true : { const: Number(status) },
      ...(response.headers
        ? {
            headers: {
              allOf: Object.entries(response.headers).map(([header, headerType]) => ({
                properties: { [header]: headerType.schema },
              })),
            },
          }
        : {}),
    },
    ...(response.content
      ? {
          discriminator: { propertyName: 'headers' },
          oneOf: Object.entries(response.content).map(([match, mediaType]) => ({
            properties: {
              headers: {
                type: 'object',
                required: ['content-type'],
                properties: { 'content-type': { type: 'string', pattern: toMatchPattern(match) } },
              },
              body:
                mediaType.schema?.type === 'string'
                  ? {
                      oneOf: [
                        mediaType.schema,
                        { type: 'object', properties: { readable: { const: true } } },
                      ],
                    }
                  : mediaType.schema,
            },
          })),
        }
      : {}),
  })),
});
