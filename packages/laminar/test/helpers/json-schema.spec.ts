import {
  AnyOfType,
  ArrayType,
  BooleanType,
  NumberType,
  ObjectType,
  OneOfType,
  StringType,
  validate,
} from '../../src/helpers/json-schema';

describe('Json Schema', () => {
  /**
   * BooleanType
   * ========================================================
   */

  it.each<[string, any, BooleanType, string[]]>([
    ['correct type', true, { type: 'boolean' }, []],
    ['wrong type', [23], { type: 'boolean' }, ['"value" should be a boolean']],
    ['wrong type', 'true', { type: 'boolean' }, ['"value" should be a boolean']],
    ['wrong type', 0, { type: 'boolean' }, ['"value" should be a boolean']],
    ['wrong nullable', null, { type: 'boolean' }, ['"value" should be a boolean']],
    ['correct nullable', null, { type: 'boolean', nullable: true }, []],
  ])('Should test boolean with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * StringType
   * ========================================================
   */

  it.each<[string, any, StringType, string[]]>([
    ['correct type', '123', { type: 'string' }, []],
    ['wrong type', 123, { type: 'string' }, ['"value" should be a string']],
    ['correct nullable', null, { type: 'string', nullable: true }, []],
    ['wrong nullable', null, { type: 'string' }, ['"value" should be a string']],
    ['correct minLength', 'aaa', { type: 'string', minLength: 2 }, []],
    ['correct maxLength', 'aaa', { type: 'string', maxLength: 10 }, []],
    ['correct minLength and maxLength', 'aaa', { type: 'string', minLength: 2, maxLength: 10 }, []],
    ['wrong minLength', 'a', { type: 'string', minLength: 2 }, ['"value" should have length >= 2']],
    [
      'wrong maxLength',
      'aaa',
      { type: 'string', maxLength: 2 },
      ['"value" should have length <= 2'],
    ],
    [
      'wrong maxLength',
      'aaaaa',
      { type: 'string', minLength: 2, maxLength: 3 },
      ['"value" should have length <= 3'],
    ],
    ['correct pattern', '123', { type: 'string', pattern: '\\d+' }, []],
    ['correct format', 'me@example.com', { type: 'string', format: 'email' }, []],
    [
      'wrong format',
      '123',
      { type: 'string', format: 'email' },
      ['"value" should match email format'],
    ],
    ['wrong pattern', 'aaa', { type: 'string', pattern: '\\d+' }, ['"value" should match /\\d+/']],
  ])('Should test string with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * NumberType
   * ========================================================
   */
  it.each<[string, any, NumberType, string[]]>([
    ['correct type', 123, { type: 'number' }, []],
    ['wrong type', '123', { type: 'number' }, ['"value" should be a number']],
    ['wrong type', { test: 'a' }, { type: 'number' }, ['"value" should be a number']],
    ['correct nullable', null, { type: 'number', nullable: true }, []],
    ['wrong nullable', null, { type: 'number' }, ['"value" should be a number']],
    ['correct integer', 2, { type: 'integer' }, []],
    ['wrong integer', 2.3, { type: 'integer' }, ['"value" should be an integer']],
    ['correct multipleOf', 10, { type: 'number', multipleOf: 5 }, []],
    ['correct multipleOf', 10, { type: 'number', multipleOf: 2 }, []],
    [
      'wrong multipleOf',
      10,
      { type: 'number', multipleOf: 3 },
      ['"value" should be a multiple of 3'],
    ],
    ['correct minimum', 10, { type: 'number', minimum: 3 }, []],
    ['correct maximum', 10, { type: 'number', maximum: 20 }, []],
    ['wrong minimum', 10, { type: 'number', minimum: 12 }, ['"value" should be >= 12']],
    ['wrong maximum', 10, { type: 'number', maximum: 3 }, ['"value" should be <= 3']],
    ['correct exclusive minimum', 10, { type: 'number', minimum: 3, exclusiveMinimum: true }, []],
    ['correct exclusive maximum', 10, { type: 'number', maximum: 20, exclusiveMaximum: true }, []],
    [
      'wrong exclusive minimum',
      10,
      { type: 'number', minimum: 12, exclusiveMinimum: true },
      ['"value" should be > 12'],
    ],
    [
      'wrong exclusive maximum',
      10,
      { type: 'number', maximum: 3, exclusiveMaximum: true },
      ['"value" should be < 3'],
    ],
  ])('Should test number with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * ObjectType
   * ========================================================
   */
  it.each<[string, any, ObjectType, string[]]>([
    ['correct type', { test: '1' }, { type: 'object' }, []],
    ['wrong type', '1123', { type: 'object' }, ['"value" should be an object']],
    ['correct nullable', null, { type: 'object', nullable: true }, []],
    ['wrong nullable', null, { type: 'object' }, ['"value" should be an object']],
    [
      '1 correct property',
      { test: '1' },
      { type: 'object', properties: { test: { type: 'string' } } },
      [],
    ],
    [
      '3 correct properties',
      { test: '1', other: 123, last: 10 },
      {
        type: 'object',
        properties: {
          test: { type: 'string', pattern: '\\d' },
          other: { type: 'number' },
          last: { type: 'number', minimum: 3, maximum: 20 },
        },
      },
      [],
    ],
    [
      '3 wrong properties',
      { test: 'aa', other: 123, last: 10 },
      {
        type: 'object',
        properties: {
          test: { type: 'string', pattern: '[0-9]+' },
          other: { type: 'string' },
          last: { type: 'number', minimum: 20 },
        },
      },
      [
        '"value.test" should match /[0-9]+/',
        '"value.other" should be a string',
        '"value.last" should be >= 20',
      ],
    ],
    [
      'correct patternProperties',
      { 'x-string': 'aa', 'x-number': 123 },
      {
        type: 'object',
        patternProperties: {
          '^x-string': { type: 'string' },
          '^x-number': { type: 'number' },
        },
      },
      [],
    ],
    [
      'wrong patternProperties',
      { 'x-string': 'aa', 'x-number': 123, 'x-10': 'aaa' },
      {
        type: 'object',
        patternProperties: {
          '^x-string': { type: 'number' },
          '^x-number': { type: 'string' },
          '^x-\\d+': { type: 'number' },
        },
      },
      [
        '"value.x-string" should be a number',
        '"value.x-number" should be a string',
        '"value.x-10" should be a number',
      ],
    ],
    [
      'correct required',
      { test: '123' },
      {
        type: 'object',
        required: ['test', 'other', 'last'],
      },
      ['"value.other" key is missing', '"value.last" key is missing'],
    ],
    [
      'correct additionalProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        properties: { test: { type: 'string' } },
      },
      [],
    ],
    [
      'wrong additionalProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        additionalProperties: false,
      },
      ['"value.other" key is unknown'],
    ],
    [
      'wrong additionalProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        additionalProperties: false,
      },
      ['"value.other" key is unknown'],
    ],
    [
      'correct minProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        minProperties: 2,
      },
      [],
    ],
    [
      'wrong minProperties',
      { test: '123' },
      {
        type: 'object',
        minProperties: 2,
      },
      ['"value" should have >= 2 keys'],
    ],
    [
      'correct maxProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        maxProperties: 2,
      },
      [],
    ],
    [
      'wrong maxProperties',
      { test: '123', other: 'stuff', last: '111' },
      {
        type: 'object',
        maxProperties: 2,
      },
      ['"value" should have <= 2 keys'],
    ],
    [
      'correct key pattern',
      { oneTest: '123', twoTest: 'stuff', threeTest: '111' },
      {
        type: 'object',
        propertyNames: { pattern: 'Test$' },
      },
      [],
    ],
    [
      'wrong key pattern',
      { testGreen: '123', testGold: 'stuff', last: '111' },
      {
        type: 'object',
        propertyNames: { pattern: '^test' },
      },
      ['"value.last" key does not match /^test/'],
    ],
    [
      'correct dependency skipped',
      {
        name: 'John Doe',
        billing_address: "555 Debtor's Lane",
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
          billing_address: { type: 'string' },
        },
        required: ['name'],
        dependencies: {
          credit_card: ['billing_address'],
        },
      },
      [],
    ],
    [
      'correct dependency',
      {
        name: 'John Doe',
        credit_card: 5555555555555555,
        billing_address: "555 Debtor's Lane",
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
          billing_address: { type: 'string' },
        },
        required: ['name'],
        dependencies: {
          credit_card: ['billing_address'],
        },
      },
      [],
    ],
    [
      'wrong dependency',
      {
        name: 'John Doe',
        credit_card: 5555555555555555,
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
          billing_address: { type: 'string' },
        },
        required: ['name'],
        dependencies: {
          credit_card: ['billing_address'],
        },
      },
      ['"value.credit_card" requires [billing_address] keys'],
    ],
    [
      'correct bidirectional dependency',
      {
        name: 'John Doe',
        credit_card: 5555555555555555,
        billing_address: "555 Debtor's Lane",
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
          billing_address: { type: 'string' },
        },
        required: ['name'],
        dependencies: {
          credit_card: ['billing_address'],
          billing_address: ['credit_card'],
        },
      },
      [],
    ],
    [
      'wrong bidirectional dependency',
      {
        name: 'John Doe',
        billing_address: "555 Debtor's Lane",
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
          billing_address: { type: 'string' },
        },
        required: ['name'],
        dependencies: {
          credit_card: ['billing_address'],
          billing_address: ['credit_card'],
        },
      },
      ['"value.billing_address" requires [credit_card] keys'],
    ],
    [
      'correct schema dependency',
      {
        name: 'John Doe',
        credit_card: 5555555555555555,
        billing_address: "555 Debtor's Lane",
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
        },
        required: ['name'],
        dependencies: {
          credit_card: {
            properties: {
              billing_address: { type: 'string' },
            },
            required: ['billing_address'],
          },
        },
      },
      [],
    ],
    [
      'wrong schema dependency',
      {
        name: 'John Doe',
        credit_card: 5555555555555555,
      },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          credit_card: { type: 'number' },
        },
        required: ['name'],
        dependencies: {
          credit_card: {
            properties: {
              billing_address: { type: 'string' },
            },
            required: ['billing_address'],
          },
        },
      },
      ['"value.billing_address" key is missing'],
    ],
  ])('Should test object with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * ArrayType
   * ========================================================
   */
  it.each<[string, any, ArrayType, string[]]>([
    ['correct type', ['1', '2'], { type: 'array', items: { type: 'string' } }, []],
    [
      'wrong type',
      123,
      { type: 'array', items: { type: 'string' } },
      ['"value" should be an array'],
    ],
    ['correct nullable', null, { type: 'array', nullable: true }, []],
    ['wrong nullable', null, { type: 'array' }, ['"value" should be an array']],
    [
      'wrong item types',
      ['1', 2],
      { type: 'array', items: { type: 'string' } },
      ['"value[1]" should be a string'],
    ],
    [
      'wrong multiple item types',
      ['1', 2, '8', 9, { test: '12' }],
      { type: 'array', items: { type: 'number' } },
      [
        '"value[0]" should be a number',
        '"value[2]" should be a number',
        '"value[4]" should be a number',
      ],
    ],
    [
      'correct composite item types',
      ['1', 2, '8'],
      { type: 'array', items: { oneOf: [{ type: 'number' }, { type: 'string' }] } },
      [],
    ],
    [
      'wrong composite item types',
      ['1', 2, '8', { test: '111' }],
      { type: 'array', items: { oneOf: [{ type: 'number' }, { type: 'string' }] } },
      ['"value[3]" should match only 1 schema, matching 0'],
    ],
    [
      'correct tuple',
      [1600, 'Pennsylvania', 'Avenue', 'NW'],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
      },
      [],
    ],
    [
      'wrong tuple',
      [24, 'Sussex', 'Drive'],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
      },
      ['"value[2]" should be one of [Street, Avenue, Boulevard]'],
    ],
    [
      'correct tuple with additional types',
      [1600, 'Pennsylvania', 'Avenue', 'NW'],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
        additionalItems: false,
      },
      [],
    ],
    [
      'wrong tuple with additional types',
      [1600, 'Pennsylvania', 'Avenue', 'NW', 'Washington'],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
        additionalItems: false,
      },
      ['"value[4]" item is unknown'],
    ],
    [
      'correct tuple with additional items schema',
      [1600, 'Pennsylvania', 'Avenue', 'NW', 'Washington'],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
        additionalItems: { type: 'string' },
      },
      [],
    ],
    [
      'wrong tuple with additional items schema',
      [1600, 'Pennsylvania', 'Avenue', 'NW', 20500],
      {
        type: 'array',
        items: [
          {
            type: 'number',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
            enum: ['Street', 'Avenue', 'Boulevard'],
          },
          {
            type: 'string',
            enum: ['NW', 'NE', 'SW', 'SE'],
          },
        ],
        additionalItems: { type: 'string' },
      },
      ['"value[4]" should be a string'],
    ],
    [
      'correct unique items',
      [1, 2, 3, 4, 5],
      {
        type: 'array',
        uniqueItems: true,
      },
      [],
    ],
    [
      'correct unique empty',
      [],
      {
        type: 'array',
        uniqueItems: true,
      },
      [],
    ],
    [
      'wrong unique items',
      [1, 2, 3, 3, 4],
      {
        type: 'array',
        uniqueItems: true,
      },
      ['"value" should have only unique values'],
    ],
  ])('Should test array with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * OneOfType
   * ========================================================
   */
  it.each<[string, any, OneOfType, string[]]>([
    ['correct type of 1', '123', { oneOf: [{ type: 'string' }] }, []],
    ['correct type of 2', '123', { oneOf: [{ type: 'string' }, { type: 'number' }] }, []],
    [
      'wrong type',
      ['a'],
      { oneOf: [{ type: 'string' }, { type: 'number' }] },
      ['"value" should match only 1 schema, matching 0'],
    ],
    [
      'correct object type 1',
      { test: '123' },
      {
        oneOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      [],
    ],
    [
      'correct object type 2',
      { test: '123' },
      {
        oneOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      [],
    ],
    [
      'wrong object type',
      { last: '123' },
      {
        oneOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      ['"value" should match only 1 schema, matching 0'],
    ],
    [
      'correct discriminator first',
      { test: 'AAA', testType: 'me' },
      {
        discriminator: {
          propertyName: 'testType',
        },
        oneOf: [
          {
            type: 'object',
            properties: {
              test: { type: 'string', pattern: '\\d+' },
              testType: { type: 'string', enum: ['me'] },
            },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              other: { type: 'number' },
              testType: { type: 'string', enum: ['other'] },
            },
            additionalProperties: false,
          },
        ],
      },
      ['"value.test" should match /\\d+/'],
    ],
    [
      'correct discriminator second',
      { test: 'AAA', testType: 'other' },
      {
        discriminator: {
          propertyName: 'testType',
        },
        oneOf: [
          {
            type: 'object',
            properties: {
              test: { type: 'string', pattern: '\\d+' },
              testType: { type: 'string', enum: ['me'] },
            },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              other: { type: 'number' },
              testType: { type: 'string', enum: ['other'] },
            },
            additionalProperties: false,
          },
        ],
      },
      ['"value.test" key is unknown'],
    ],
  ])('Should test oneOf with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  /**
   * AnyOfType
   * ========================================================
   */
  it.each<[string, any, AnyOfType, string[]]>([
    [
      'correct type 1',
      { test: '123' },
      {
        anyOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      [],
    ],
    [
      'correct type 2',
      { other: 123 },
      {
        anyOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      [],
    ],
    [
      'wrong type 1',
      { last: '123', other: 123 },
      {
        anyOf: [
          {
            type: 'object',
            properties: { test: { type: 'string', pattern: '\\d+' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { other: { type: 'number' } },
            additionalProperties: false,
          },
        ],
      },
      ['"value" should match at least 1 schema'],
    ],
  ])('Should test anyOf with %s', (_, value, schema, errors) => {
    expect(validate(schema, value)).toEqual(errors);
  });

  it('Should test integration', () => {
    const schema = {
      oneOf: [
        {
          description: 'Balances for a PAYG+ customer.',
          type: 'object',
          required: ['singleWalletBalance'],
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

    expect(validate(schema, { singleWalletBalance: { value: 10 } })).toEqual([
      '"value.singleWalletBalance.fuelType" key is missing',
    ]);
  });
});
