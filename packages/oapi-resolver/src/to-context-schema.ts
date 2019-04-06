import { toMatchPattern } from './helpers';
import { OperationObject } from './types';

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
