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

  it('Should discriminate schema', async () => {
    const schema: Schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: {
              const: 'cat',
            },
            size: {
              type: 'integer',
            },
          },
        },
        {
          type: 'object',
          properties: {
            type: {
              const: 'dog',
            },
          },
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    };

    const result = await validate(schema, { type: 'cat', size: 'big' });
    expect(result.errors).toEqual(['[value.size] should be a [integer]']);
  });

  it('Should optimize one anyOf', async () => {
    const schema: Schema = {
      anyOf: [
        {
          type: 'object',
          properties: {
            type: {
              const: 'cat',
            },
            size: {
              type: 'integer',
            },
          },
        },
      ],
    };

    const result = await validate(schema, { type: 'cat', size: 'big' });
    expect(result.errors).toEqual(['[value.size] should be a [integer]']);
  });

  it('Should protect multipleOf', async () => {
    const schema: Schema = { multipleOf: 2 };

    const infinityResult = await validate(schema, Infinity);
    const nanResult = await validate(schema, NaN);
    expect(infinityResult.errors).toEqual(['[value] should be a multiple of 2']);
    expect(nanResult.errors).toEqual(['[value] should be a multiple of 2']);
  });

  it.each<[string, string, boolean]>([
    ['date-time', '2018-01-01T00:00:00Z', true],
    ['date-time', '2018-01-01T00:00:00.123+02:00', true],
    ['date-time', '2018-01-01', false],

    ['time', '00:00:00', true],
    ['time', '12:10:00.123', true],
    ['time', '12:10:110', false],
    ['time', '100:10:00', false],

    ['date', '2018-01-01', true],
    ['date', '2018-aa', false],

    ['email', 'me@example.com', true],
    ['email', 'example.com', false],

    ['hostname', 'example.com', true],
    ['hostname', 'sub.example.com', true],
    ['hostname', 'http://example.com', false],

    ['uri', 'http://example.com', true],
    ['uri', 'mailto:John.Doe@example.com', true],
    ['uri', 'http://example.com/path/to/riches', true],
    ['uri', 'banana', false],

    ['url', 'http://example.com', true],
    ['url', 'ftp://ftp.is.co.za/rfc/rfc1808.txt', true],
    ['url', 'mailto:John.Doe@example.com', false],
    ['url', 'banana', false],

    ['uuid', '98dec6be-8782-4a18-9ba5-d44daee96956', true],
    ['uuid', 'banana', false],

    ['json-pointer', '/test/path', true],
    ['json-pointer', '/test/pa~0t~1h', true],
    ['json-pointer', 'banana', false],

    ['relative-json-pointer', '2/test/path', true],
    ['relative-json-pointer', 'banana', false],

    ['ipv4', '127.0.0.1', true],
    ['ipv4', 'aa.0.0.1', false],
  ])('Should validate format %s for %s is %s', async (format, value, expected) => {
    const result = await validate({ format }, value);
    expect(result.valid).toBe(expected);
  });
});
