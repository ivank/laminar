import { toMatchPattern } from './helpers';
import { HeaderObject, MediaTypeObject, OperationObject, ResponseObject } from './types';

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
