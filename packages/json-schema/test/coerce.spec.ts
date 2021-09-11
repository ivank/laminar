import { coerce, Schema } from '../src';

describe('Coerce', () => {
  it.each<[string, Schema, unknown, unknown]>([
    ['exact', { type: 'integer' }, 10, 10],
    ['integer', { type: 'integer' }, '10', 10],
    ['number', { type: 'number' }, '10.2', 10.2],
    ['boolean exact', { type: 'boolean' }, true, true],
    ['boolean from true', { type: 'boolean' }, 'true', true],
    ['boolean from yes', { type: 'boolean' }, 'yes', true],
    ['boolean from 1', { type: 'boolean' }, '1', true],
    ['boolean from false', { type: 'boolean' }, 'false', false],
    ['boolean from no', { type: 'boolean' }, 'no', false],
    ['boolean from 0', { type: 'boolean' }, '0', false],
    ['null', { type: 'null' }, 'null', null],
    ['oneof branch 1', { oneOf: [{ type: 'null' }, { type: 'integer' }] }, 'null', null],
    ['oneof branch 2', { oneOf: [{ type: 'null' }, { type: 'integer' }] }, '10', 10],
    ['oneof no branch', { oneOf: [{ type: 'null' }, { type: 'integer' }] }, 'test', 'test'],
    ['anyOf branch 1', { anyOf: [{ type: 'null' }, { type: 'integer' }] }, 'null', null],
    ['anyOf branch 2', { anyOf: [{ type: 'null' }, { type: 'integer' }] }, '10', 10],
    [
      'properties',
      { properties: { str: { type: 'string' }, int: { type: 'integer' } } },
      { str: 'a', int: '11' },
      { str: 'a', int: 11 },
    ],
    [
      'complex',
      {
        allOf: [
          {
            properties: {
              query: {
                properties: { tags: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
          {
            properties: {
              query: {
                properties: {
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer', minimum: 0, default: 0 },
                      perPage: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 25,
                      },
                    },
                    additionalProperties: false,
                    default: { page: 0, perPage: 25 },
                  },
                },
              },
            },
          },
          {
            properties: {
              query: {
                properties: {
                  sort: {
                    type: 'object',
                    properties: {
                      field: { enum: ['name', 'tag'] },
                      order: { enum: ['ASC', 'DESC'], default: 'ASC' },
                    },
                    additionalProperties: false,
                    default: {},
                  },
                },
              },
            },
          },
          {
            properties: {
              query: {
                properties: { afterDateTime: { type: 'string', format: 'date-time' } },
              },
            },
          },
          {
            properties: {
              query: {
                properties: { afterDate: { type: 'string', format: 'date' } },
              },
            },
          },
          {
            properties: {
              query: {
                properties: {
                  limit: { type: 'integer', format: 'int32', default: 1000 },
                },
              },
            },
          },
          {
            properties: {
              query: {
                properties: { ids: { type: 'array', items: { type: 'integer' } } },
              },
            },
          },
          {
            properties: {
              query: { properties: { isKitten: { type: 'boolean' } } },
            },
          },
          {
            properties: {
              query: { properties: { price: { type: 'number' } } },
            },
          },
        ],
      },
      { query: { afterDate: '2020-01-01' } },
      {
        query: {
          afterDate: '2020-01-01',
          limit: 1000,
          pagination: { page: 0, perPage: 25 },
          sort: { order: 'ASC' },
        },
      },
    ],
  ])('Should coerce query for %s', async (_, schema, value, expected) => {
    expect(await coerce({ schema, value, type: 'query' })).toEqual(expected);
  });
});
