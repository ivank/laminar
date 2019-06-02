import { Schema } from '@ovotech/json-schema';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { toMatchPattern } from './helpers';
import {
  ResoledOpenAPIObject,
  ResolvedOperationObject,
  ResolvedParameterObject,
  ResolvedRequestBodyObject,
  ResolvedResponseObject,
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

export const toSchema = (api: ResoledOpenAPIObject) => {
  return Object.entries(api.paths).reduce<PathsSchema>(
    (pathsSchema, [path, methods]) => ({
      ...pathsSchema,
      [path]: Object.entries(methods).reduce(
        (methodSchema, [method, operation]) => ({
          ...methodSchema,
          [method]: toOperationSchema(api, operation),
        }),
        {},
      ),
    }),
    {},
  );
};

export const toOperationSchema = (
  api: ResoledOpenAPIObject,
  operation: ResolvedOperationObject,
): OperationSchema => ({
  context: toContextSchema(api, operation),
  response: toResponseSchema(operation),
  security: operation.security || api.security,
});

export const toRequestBodySchema = (requestBody: ResolvedRequestBodyObject) => ({
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

const toParamLocation = (location: string) => {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
};

export const toParameterSchema = (param: ResolvedParameterObject) =>
  ({
    properties: {
      [toParamLocation(param.in)]: {
        ...(param.required ? { required: [param.name] } : {}),
        ...(param.schema ? { properties: { [param.name]: param.schema } } : {}),
      },
    },
  } as Schema);

export const toContextSchema = (
  { security: defaultSecurity, components }: ResoledOpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: ResolvedOperationObject,
) => {
  const security = operationSecurity || defaultSecurity;
  const securitySchemes = components && components.securitySchemes;
  return {
    allOf: [
      ...(parameters ? parameters.map(toParameterSchema) : []),
      ...(requestBody ? [toRequestBodySchema(requestBody)] : []),
      ...(security && securitySchemes ? [toSecuritySchema(security, securitySchemes)] : []),
    ],
  } as Schema;
};

export const toResponseSchema = ({ responses }: ResolvedOperationObject) =>
  ({
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
                  properties: {
                    'content-type': { type: 'string', pattern: toMatchPattern(match) },
                  },
                },
                body: mediaType.schema,
              },
            })),
          }
        : {}),
    })),
  } as Schema);

export const toSecuritySchema = (
  security: SecurityRequirementObject[],
  schemes: { [securityScheme: string]: SecuritySchemeObject },
) => ({
  anyOf: security.map(item => ({
    allOf: Object.entries(item).map(([name, scopes]) => {
      const scheme = schemes[name];
      if (!scheme) {
        return {};
      }

      switch (scheme.type) {
        case 'http':
          return {
            properties: {
              headers: {
                properties: {
                  authorization: {
                    format: new RegExp(`^${scheme.scheme}`, 'i'),
                  },
                },
                required: ['authorization'],
              },
            },
          };
        case 'apiKey':
          return {
            properties: {
              [toParamLocation(scheme.in!)]: {
                required: [scheme.name!.toLowerCase()],
              },
            },
          };
        default:
          return {};
      }
    }),
  })),
});
