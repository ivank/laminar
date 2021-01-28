import { validate, Schema, ensureValid } from '../src';

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
                      description: 'The value of the balance. 1/1000ths of a penny. eg. 1000=1p, 100000=£1',
                      type: 'integer',
                      format: 'int32',
                      example: '123000',
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

    const result = await validate({
      schema,
      value: { post: true, singleWalletBalance: { fuelType: '111' } },
    });
    expect(result.errors).toEqual([
      '[value] (additionalProperties) has unknown key post',
      '[value.singleWalletBalance] (required) is missing [value] keys',
      '[value.singleWalletBalance.fuelType] (enum) should be one of [DualFuel]',
    ]);
  });

  it('Should validate complex allOf anyOf', async () => {
    const schema: Schema = {
      allOf: [
        {
          properties: {
            headers: {
              required: ['x-trace-token'],
              properties: { 'x-trace-token': { type: 'string', format: 'uuid' } },
            },
          },
          required: ['headers'],
        },
        {
          anyOf: [
            {
              allOf: [
                {
                  properties: {
                    headers: {
                      properties: { authorization: { pattern: '^Bearer' } },
                      required: ['authorization'],
                    },
                  },
                  required: ['headers'],
                },
                {
                  properties: { headers: { required: ['x-api-key'] } },
                  required: ['headers'],
                },
              ],
            },
            {
              properties: { cookies: { required: ['auth'] } },
              required: ['cookies'],
            },
          ],
        },
      ],
    };

    const result = await validate({
      schema,
      value: { headers: { 'x-trace-token': '123e4567-e89b-12d3-a456-426614174000' } },
    });

    expect(result.errors).toEqual([
      '[value] (anyOf) should match at least 1 schema\n' +
        '  | Schema 1:\n' +
        '  |   [.headers] (required) is missing [authorization] keys\n' +
        '  |   [.headers] (required) is missing [x-api-key] keys\n' +
        '  | Schema 2:\n' +
        '  |   [] (required) is missing [cookies] keys',
    ]);
  });

  it('Should ensureValid', async () => {
    const animalSchema: Schema = {
      properties: {
        animal: { type: 'string', pattern: 'cat|dog' },
        weight: { type: 'number' },
      },
    };

    type AnimalType = {
      animal: 'cat' | 'dog';
      weight: number;
    };

    const value = { animal: 'cat', weight: 12 };
    const value2 = { animal: 'other', weight: '12' };

    await expect(
      ensureValid<AnimalType>({ schema: animalSchema, value: value }),
    ).resolves.toMatchObject({ value });
    await expect(
      ensureValid<AnimalType>({ schema: animalSchema, value: value2 }),
    ).rejects.toMatchObject({
      message:
        'Invalid value\n[value.animal] (pattern) should match /cat|dog/\n[value.weight] (type) should be of type number,integer\n',
    });
    await expect(
      ensureValid<AnimalType>({ schema: animalSchema, value: value2, name: 'MyObject' }),
    ).rejects.toMatchObject({
      message:
        'Invalid MyObject\n[MyObject.animal] (pattern) should match /cat|dog/\n[MyObject.weight] (type) should be of type number,integer\n',
    });
  });

  it('Should not discriminate schema in default draft', async () => {
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

    const result = await validate({ schema, value: { type: 'cat', size: 'big' } });
    expect(result.errors).toEqual([
      '[value] (oneOf) should satisfy exactly only 1 schema\n' +
        '  | Schema 1:\n' +
        '  |   [.size] (type) should be of type integer\n' +
        '  | Schema 2:\n' +
        '  |   [.type] (enum) should be one of [dog]',
    ]);
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

    const result = await validate({ schema, value: { type: 'cat', size: 'big' } });
    expect(result.errors).toEqual(['[value.size] (type) should be of type integer']);
  });

  it('Should display errors for oneOf', async () => {
    const schema: Schema = {
      oneOf: [
        {
          type: 'string',
        },
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

    const result = await validate({ schema, value: 123 });
    expect(result.errors).toEqual([
      '[value] (oneOf) should satisfy exactly only 1 schema\n  | Schema 1:\n  |   [] (type) should be of type string\n  | Schema 2:\n  |   [] (type) should be of type object',
    ]);
  });

  it('Should protect multipleOf', async () => {
    const schema: Schema = { multipleOf: 2 };

    const infinityResult = await validate({ schema, value: Infinity });
    const nanResult = await validate({ schema, value: NaN });
    expect(infinityResult.errors).toEqual(['[value] (multipleOf) should be a multiple of 2']);
    expect(nanResult.errors).toEqual(['[value] (multipleOf) should be a multiple of 2']);
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
    const result = await validate({ schema: { format }, value });
    expect(result.valid).toBe(expected);
  });
});
