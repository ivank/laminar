import { Schema } from '@ovotech/json-schema';
import { toMatchPattern } from './helpers';
import {
  ResolvedOperationObject,
  ResolvedParameterObject,
  ResolvedPathsObject,
  ResolvedRequestBodyObject,
  ResolvedResponseObject,
} from './resolved-openapi-object';

export interface OperationSchema {
  context: Schema;
  response: Schema;
}

export interface PathsSchema {
  [path: string]: { [method: string]: OperationSchema };
}

export const toPathsSchema = (paths: ResolvedPathsObject) => {
  return Object.entries(paths).reduce<PathsSchema>(
    (pathsSchema, [path, methods]) => ({
      ...pathsSchema,
      [path]: Object.entries(methods).reduce(
        (methodSchema, [method, operation]) => ({
          ...methodSchema,
          [method]: toOperationSchema(operation),
        }),
        {},
      ),
    }),
    {},
  );
};

export const toOperationSchema = (operation: ResolvedOperationObject) => ({
  context: toContextSchema(operation),
  response: toResponseSchema(operation),
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

export const toParameterSchema = (param: ResolvedParameterObject) =>
  ({
    properties: {
      [param.in]: {
        ...(param.required ? { required: [param.name] } : {}),
        ...(param.schema ? { properties: { [param.name]: param.schema } } : {}),
      },
    },
  } as Schema);

export const toContextSchema = ({ requestBody, parameters }: ResolvedOperationObject) =>
  ({
    allOf: [
      ...(parameters ? parameters.map(toParameterSchema) : []),
      ...(requestBody ? [toRequestBodySchema(requestBody)] : []),
    ],
  } as Schema);

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
