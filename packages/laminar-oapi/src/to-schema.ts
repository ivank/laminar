import { toMatchPattern } from './helpers';
import {
  HeaderObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ResponseObject,
} from './types';

export const toSchema = (api: OpenAPIObject, path: string, method: string) => {
  const operation = api.paths[path][method];

  return {
    context: toContextSchema(operation),
    response: toResponseSchema(operation),
  };
};

export const toContextSchema = ({ requestBody, parameters }: Partial<OperationObject>): any => ({
  allOf: [
    ...(parameters
      ? parameters.map(param => ({
          properties: {
            [param.in]: {
              ...(param.required ? { required: [param.name] } : {}),
              ...(param.schema ? { properties: { [param.name]: param.schema } } : {}),
            },
          },
        }))
      : []),
    requestBody
      ? {
          ...(requestBody.required ? { required: ['body'] } : {}),
          ...(requestBody.content
            ? {
                discriminator: {
                  propertyName: 'headers',
                },
                oneOf: Object.entries(requestBody.content).map(([match, mediaType]) => ({
                  properties: {
                    headers: {
                      type: 'object',
                      required: ['content-type'],
                      properties: {
                        'content-type': {
                          type: 'string',
                          pattern: toMatchPattern(match),
                        },
                      },
                    },
                    body: mediaType.schema,
                  },
                })),
              }
            : {}),
        }
      : {},
  ],
});

export const toResponseSchema = ({ responses }: OperationObject): any => ({
  discriminator: {
    propertyName: 'status',
  },
  oneOf: Object.entries(responses).map(([status, response]) => ({
    type: 'object',
    properties: {
      status: status === 'default' ? true : { const: Number(status) },
      ...((response as ResponseObject).headers
        ? {
            headers: {
              allOf: Object.entries(response.headers).map(([header, headerType]) => ({
                properties: {
                  [header]: (headerType as HeaderObject).schema,
                },
              })),
            },
          }
        : {}),
    },
    ...((response as ResponseObject).content
      ? {
          discriminator: {
            propertyName: 'headers',
          },
          oneOf: Object.entries(response.content).map(([match, mediaType]) => ({
            properties: {
              headers: {
                type: 'object',
                required: ['content-type'],
                properties: {
                  'content-type': {
                    type: 'string',
                    pattern: toMatchPattern(match),
                  },
                },
              },
              body: (mediaType as MediaTypeObject).schema,
            },
          })),
        }
      : {}),
  })),
});
