import { Schema, validate } from '../src';

describe('Helper isEqual', () => {
  it('Should validate schema', async () => {
    const schema: Schema = {
      oneOf: [
        {
          description: 'Balances for a PAYG+ customer.',
          type: 'object',
          additionalProperties: false,
          properties: {
            singleWalletBalance: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    value: {
                      description:
                        'The value of the balance. 1/1000ths of a penny. eg. 1000=1p, 100000=£1',
                      type: 'integer',
                      format: 'int32',
                      example: 123000,
                    },
                    effectiveAt: {
                      description: 'The last transaction date-time that updated the balance.',
                      type: 'string',
                      format: 'date-time',
                      example: '2019-01-30T17:32:28Z',
                    },
                    updatedAt: {
                      description: 'The date-time that the balance was updated.',
                      type: 'string',
                      format: 'date-time',
                      example: '2019-01-30T17:53:28Z',
                    },
                  },
                  required: ['value'],
                },
                {
                  type: 'object',
                  properties: {
                    fuelType: {
                      description: 'The fuel that the balance is for.',
                      type: 'string',
                      enum: ['DualFuel'],
                    },
                  },
                  required: ['fuelType'],
                },
              ],
            },
          },
        },
      ],
    };

    const result = await validate(schema, { post: true, singleWalletBalance: { fuelType: '111' } });
    expect(result.errors).toEqual([
      '[value] has unknown keys [post]',
      '[value.singleWalletBalance] is missing [value] keys',
      '[value.singleWalletBalance.fuelType] should be one of [DualFuel]',
    ]);
  });
});
