import {
  AnyOfType,
  ArrayType,
  NumberType,
  ObjectType,
  OneOfType,
  StringType,
  validate,
  ValidationError,
} from '../../src/helpers/json-schema';

describe('Json Schema', () => {
  /**
   * StringType
   * ========================================================
   */

  it.each<[string, any, StringType, ValidationError[]]>([
    ['correct type', '123', { type: 'string' }, []],
    ['wrong type', 123, { type: 'string' }, [{ message: 'root is not a string' }]],
    ['correct minLength', 'aaa', { type: 'string', minLength: 2 }, []],
    ['correct maxLength', 'aaa', { type: 'string', maxLength: 10 }, []],
    ['correct minLength and maxLength', 'aaa', { type: 'string', minLength: 2, maxLength: 10 }, []],
    [
      'wrong minLength',
      'a',
      { type: 'string', minLength: 2 },
      [{ message: 'root has length < 2' }],
    ],
    [
      'wrong maxLength',
      'aaa',
      { type: 'string', maxLength: 2 },
      [{ message: 'root has length > 2' }],
    ],
    [
      'wrong maxLength',
      'aaaaa',
      { type: 'string', minLength: 2, maxLength: 3 },
      [{ message: 'root has length > 3' }],
    ],
    ['correct pattern', '123', { type: 'string', pattern: '\\d+' }, []],
    [
      'wrong pattern',
      'aaa',
      { type: 'string', pattern: '\\d+' },
      [{ message: 'root does not match /\\d+/' }],
    ],
  ])('Should test string with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });

  /**
   * NumberType
   * ========================================================
   */
  it.each<[string, any, NumberType, ValidationError[]]>([
    ['correct type', 123, { type: 'number' }, []],
    ['wrong type', '123', { type: 'number' }, [{ message: 'root is not a number' }]],
    ['wrong type', { test: 'a' }, { type: 'number' }, [{ message: 'root is not a number' }]],
    ['correct multipleOf', 10, { type: 'number', multipleOf: 5 }, []],
    ['correct multipleOf', 10, { type: 'number', multipleOf: 2 }, []],
    [
      'wrong multipleOf',
      10,
      { type: 'number', multipleOf: 3 },
      [{ message: 'root is not a multiple of 3' }],
    ],
    ['correct minimum', 10, { type: 'number', minimum: 3 }, []],
    ['correct maximum', 10, { type: 'number', maximum: 20 }, []],
    ['wrong minimum', 10, { type: 'number', minimum: 12 }, [{ message: 'root should be ≥ 12' }]],
    ['wrong maximum', 10, { type: 'number', maximum: 3 }, [{ message: 'root should be ≤ 3' }]],
    ['correct exclusive minimum', 10, { type: 'number', minimum: 3, exclusiveMinimum: true }, []],
    ['correct exclusive maximum', 10, { type: 'number', maximum: 20, exclusiveMaximum: true }, []],
    [
      'wrong exclusive minimum',
      10,
      { type: 'number', minimum: 12, exclusiveMinimum: true },
      [{ message: 'root should be > 12' }],
    ],
    [
      'wrong exclusive maximum',
      10,
      { type: 'number', maximum: 3, exclusiveMaximum: true },
      [{ message: 'root should be < 3' }],
    ],
  ])('Should test number with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });

  /**
   * ObjectType
   * ========================================================
   */
  it.each<[string, any, ObjectType, ValidationError[]]>([
    ['correct type', { test: '1' }, { type: 'object' }, []],
    ['wrong type', '1123', { type: 'object' }, [{ message: 'root is not a object' }]],
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
        { message: 'root.test does not match /[0-9]+/' },
        { message: 'root.other is not a string' },
        { message: 'root.last should be ≥ 20' },
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
        { message: 'root.x-string is not a number' },
        { message: 'root.x-number is not a string' },
        { message: 'root.x-10 is not a number' },
      ],
    ],
    [
      'correct required',
      { test: '123' },
      {
        type: 'object',
        required: ['test', 'other', 'last'],
      },
      [{ message: 'root.other is required' }, { message: 'root.last is required' }],
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
      [{ message: 'root.other is unknown' }],
    ],
    [
      'wrong additionalProperties',
      { test: '123', other: 'stuff' },
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        additionalProperties: false,
      },
      [{ message: 'root.other is unknown' }],
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
      [{ message: 'root props count should be ≥ 2' }],
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
      [{ message: 'root props count should be ≤ 2' }],
    ],
  ])('Should test object with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });

  /**
   * ArrayType
   * ========================================================
   */
  it.each<[string, any, ArrayType, ValidationError[]]>([
    ['correct type', ['1', '2'], { type: 'array', items: { type: 'string' } }, []],
    [
      'wrong type',
      123,
      { type: 'array', items: { type: 'string' } },
      [{ message: 'root is not an array' }],
    ],
    [
      'wrong item types',
      ['1', 2],
      { type: 'array', items: { type: 'string' } },
      [{ message: 'root[1] is not a string' }],
    ],
    [
      'wrong multiple item types',
      ['1', 2, '8', 9, { test: '12' }],
      { type: 'array', items: { type: 'number' } },
      [
        { message: 'root[0] is not a number' },
        { message: 'root[2] is not a number' },
        { message: 'root[4] is not a number' },
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
      [{ message: 'root[3] must match exactly one schema' }],
    ],
  ])('Should test array with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });

  /**
   * OneOfType
   * ========================================================
   */
  it.each<[string, any, OneOfType, ValidationError[]]>([
    ['correct type of 1', '123', { oneOf: [{ type: 'string' }] }, []],
    ['correct type of 2', '123', { oneOf: [{ type: 'string' }, { type: 'number' }] }, []],
    [
      'wrong type',
      ['a'],
      { oneOf: [{ type: 'string' }, { type: 'number' }] },
      [{ message: 'root must match exactly one schema' }],
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
      [{ message: 'root must match exactly one schema' }],
    ],
  ])('Should test oneOf with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });

  /**
   * AnyOfType
   * ========================================================
   */
  it.each<[string, any, AnyOfType, ValidationError[]]>([
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
      [{ message: 'root does not match any schema' }],
    ],
  ])('Should test anyOf with %s', (_, value, schema, errors) => {
    expect(validate(schema, value, { name: 'root' })).toEqual(errors);
  });
});
