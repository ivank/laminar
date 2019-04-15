import { OpenAPIObject } from 'openapi3-ts';
import { convert } from '../src/oapi';

describe('Json Schema Ts', () => {
  it('Test', async () => {
    const schema: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        description: 'Balance Service Endpoint definitions.',
        version: '0.1.0',
        title: 'Swagger Balance Service',
        contact: {
          email: 'tech@example.com',
          url: 'tech@example.com',
          name: 'tech@example.com',
        },
      },
      tags: [
        {
          name: 'account',
          description: 'Account related endpoints',
        },
        {
          name: 'internal',
          description: 'Service related internal endpoints',
        },
      ],
      paths: {
        '/internal/status': {
          get: {
            tags: ['internal'],
            summary: 'Health check endpoint',
            description:
              'Returns 200 if the application is up. It does not do deep check. Always gives back 200.',
            operationId: 'getStatus',
            responses: {
              '200': {
                description: 'Application is up',
              },
            },
          },
        },
        '/internal/swagger.yaml': {
          get: {
            tags: ['internal'],
            summary: 'Returns application swagger definition',
            operationId: 'getSwagger',
            responses: {
              '200': {
                description: 'Application swagger definition',
              },
            },
          },
        },
        '/api/v2/accounts/{accountId}/balance': {
          get: {
            tags: ['account'],
            summary: 'DEPRECATED: Find Balance for the given accountId',
            description: 'Returns the balance',
            operationId: 'findBalanceFor-V2',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account to return',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/BalanceSummaryHttpResponse',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid accountId supplied',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '404': {
                description: 'Balance not found for accountId',
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v2/accounts/{accountId}/transactions': {
          get: {
            tags: ['account'],
            summary:
              'DEPRECATED: Find Transactions for the given accountId. Generic endpoint capable of returning with all the supported transaction types. See transactionType parameter!',
            description: 'Returns the transaction history',
            operationId: 'findTransactionsFor-V2',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account to return',
                required: true,
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'fromDate',
                in: 'query',
                description: 'Start date for the search period (inclusive)',
                required: true,
                schema: {
                  type: 'string',
                  format: 'date',
                },
              },
              {
                name: 'toDate',
                in: 'query',
                description: 'End date for the search period (inclusive)',
                required: true,
                schema: {
                  type: 'string',
                  format: 'date',
                },
              },
              {
                name: 'transactionType',
                in: 'query',
                description:
                  'Transaction type to search. If not provided every transaction will be fetched relevant for the account/period',
                schema: {
                  type: 'array',
                  items: {
                    enum: [
                      'TopUp',
                      'ElectricityUsageCharge',
                      'ElectricityStandingCharge',
                      'BalanceAdjustment',
                    ],
                  },
                },
              },
            ],
            responses: {
              '200': {
                description:
                  'Successful response. NOTE: If the account ID is valid but does not exists in our system the result will be an empty transactions list with 200 unlike for the balance endpoint where it returns with 204. It might change in the future if the client needs this information for the transaction history as well.',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/TransactionHistoryHttpResponseV2',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid path or query parameter supplied',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v2/accounts/{accountId}/adjust-balance': {
          post: {
            tags: ['account'],
            summary: 'DEPRECATED: Adjust balance for a given accountId',
            description: 'Returns with the adjusted balance',
            operationId: 'adjustBalanceFor-V2',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            requestBody: {
              description: 'Adjustment Data',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AdjustBalanceRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/BalanceSummaryHttpResponse',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid request. User data error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '404': {
                description: 'Balance not found for accountId',
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v3/accounts/{accountId}/balance': {
          get: {
            tags: ['account'],
            summary: 'Find Balance for the given accountId',
            description: 'Returns the balance',
            operationId: 'findBalanceFor-V3',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account to return',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/BalanceSummaryHttpResponse',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid accountId supplied',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '404': {
                description: 'Balance not found for accountId',
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v3/accounts/{accountId}/transactions': {
          get: {
            tags: ['account'],
            summary:
              'Find Transactions for the given accountId. Generic endpoint capable of returning with all the supported transaction types. See transactionType parameter!',
            description: 'Returns the transaction history',
            operationId: 'findTransactionsFor-V3',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account to return',
                required: true,
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'fromDate',
                in: 'query',
                description: 'Start date for the search period (inclusive)',
                required: true,
                schema: {
                  type: 'string',
                  format: 'date',
                },
              },
              {
                name: 'toDate',
                in: 'query',
                description: 'End date for the search period (inclusive)',
                required: true,
                schema: {
                  type: 'string',
                  format: 'date',
                },
              },
              {
                name: 'transactionType',
                in: 'query',
                description:
                  'Transaction type to search. If not provided every transaction will be fetched relevant for the account/period',
                schema: {
                  type: 'array',
                  items: {
                    enum: [
                      'TopUp',
                      'ElectricityUsageCharge',
                      'ElectricityStandingCharge',
                      'BalanceAdjustment',
                    ],
                  },
                },
              },
            ],
            responses: {
              '200': {
                description:
                  'Successful response. NOTE: If the account ID is valid but does not exists in our system the result will be an empty transactions list with 200 unlike for the balance endpoint where it returns with 204. It might change in the future if the client needs this information for the transaction history as well.',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/TransactionHistoryHttpResponseV3',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid path or query parameter supplied',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v3/accounts/{accountId}/adjust-balance': {
          post: {
            tags: ['account'],
            summary: 'Adjust balance for a given accountId',
            description: 'Returns with the adjusted balance',
            operationId: 'adjustBalanceFor-V3',
            parameters: [
              {
                name: 'accountId',
                in: 'path',
                description: 'ID of the account',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            requestBody: {
              description: 'Adjustment Data',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AdjustBalanceRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/BalanceSummaryHttpResponse',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid request. User data error',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
              '404': {
                description: 'Balance not found for accountId',
              },
              '500': {
                description: 'Technical error inside Balance system',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HttpErrorResponse',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          BalanceSummaryHttpResponse: {
            type: 'object',
            properties: {
              balance: {
                type: 'number',
                format: 'float',
              },
              effectiveAt: {
                description: 'Last transaction date-time which updated the balance',
                type: 'string',
                format: 'date-time',
              },
              updatedAt: {
                description: 'When balance service updated the balance',
                type: 'string',
                format: 'date-time',
              },
            },
          },
          TransactionHistoryHttpResponseV2: {
            type: 'object',
            properties: {
              summary: {
                $ref: '#/components/schemas/TransactionHistorySummary',
              },
              transactions: {
                description:
                  'List of transactions ordered by transactionDateTime in ascending order.',
                type: 'array',
                items: {
                  oneOf: [
                    {
                      $ref: '#/components/schemas/GenericTransactionEntity',
                    },
                    {
                      $ref: '#/components/schemas/ChargeTransactionEntity',
                    },
                  ],
                },
              },
            },
          },
          TransactionHistoryHttpResponseV3: {
            type: 'object',
            properties: {
              summary: {
                $ref: '#/components/schemas/TransactionHistorySummary',
              },
              transactions: {
                description:
                  'List of transactions ordered by transactionDateTime in ascending order.',
                type: 'array',
                items: {
                  oneOf: [
                    {
                      $ref: '#/components/schemas/GenericTransactionEntity',
                    },
                    {
                      $ref: '#/components/schemas/UsageChargeTransactionEntity',
                    },
                    {
                      $ref: '#/components/schemas/StandingChargeTransactionEntity',
                    },
                  ],
                },
              },
            },
          },
          TransactionHistorySummary: {
            type: 'object',
            properties: {
              totalSize: {
                description: 'Number of search hits',
                type: 'integer',
                format: 'int32',
              },
            },
          },
          GenericTransactionEntity: {
            type: 'object',
            properties: {
              transactionType: {
                type: 'string',
                enum: ['TopUp', 'BalanceAdjustment'],
              },
              amount: {
                type: 'number',
                format: 'float',
              },
              transactionDateTime: {
                type: 'string',
                format: 'date-time',
              },
              cause: {
                description:
                  "CamelCased cause why the adjustment is needed, e.g. 'GoodWill', 'WarmHomeDiscount', 'DiscretionaryCredit', 'AppPayment'",
                type: 'string',
              },
            },
          },
          ChargeTransactionEntity: {
            type: 'object',
            properties: {
              transactionType: {
                type: 'string',
                enum: ['ElectricityUsageCharge', 'ElectricityStandingCharge'],
              },
              amount: {
                type: 'number',
                format: 'float',
              },
              transactionDateTime: {
                type: 'string',
                format: 'date-time',
              },
              fuelType: {
                type: 'string',
                enum: ['Electricity', 'Gas'],
              },
            },
          },
          UsageChargeTransactionEntity: {
            type: 'object',
            properties: {
              transactionType: {
                type: 'string',
                enum: ['ElectricityUsageCharge'],
              },
              amount: {
                type: 'number',
                format: 'float',
              },
              transactionDateTime: {
                type: 'string',
                format: 'date-time',
              },
              fuelType: {
                type: 'string',
                enum: ['Electricity', 'Gas'],
              },
              msn: {
                type: 'string',
                description: 'Meter Serial Number',
              },
              read: {
                type: 'number',
                format: 'float',
                description: 'The meter read that triggered the charge.',
              },
              consumption: {
                type: 'number',
                format: 'float',
                description: 'The consumption amount (kwH) corresponding to this charge.',
              },
            },
          },
          StandingChargeTransactionEntity: {
            type: 'object',
            properties: {
              transactionType: {
                type: 'string',
                enum: ['ElectricityStandingCharge'],
              },
              amount: {
                type: 'number',
                format: 'float',
              },
              transactionDateTime: {
                type: 'string',
                format: 'date-time',
              },
              fuelType: {
                type: 'string',
                enum: ['Electricity', 'Gas'],
              },
            },
          },
          AdjustBalanceRequest: {
            type: 'object',
            properties: {
              transactionId: {
                type: 'string',
              },
              amount: {
                description: 'Signed amount to adjust the balance with',
                type: 'number',
                format: 'float',
              },
              transactionDateTime: {
                description: 'Adjustment date-time',
                type: 'string',
                format: 'date-time',
              },
              cause: {
                description:
                  "CamelCased cause why the adjustment is needed, e.g. 'GoodWill', 'WarmHomeDiscount', 'DiscretionaryCredit'",
                type: 'string',
              },
            },
          },
          HttpErrorResponse: {
            type: 'object',
            properties: {
              errorCode: {
                description: 'PLANNED. Currently not sent',
                type: 'string',
              },
              message: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const result = await convert(schema);
    // console.log(inspect(ast, { depth: 10 }));
    console.log(result);
    // console.log(ast.context.registry);
    // console.log(registryToTs(ast.context.registry));
  });
});
