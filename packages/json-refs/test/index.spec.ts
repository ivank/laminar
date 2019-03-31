import nock = require('nock');
import { resolveRefs } from '../src';

describe('json-refs', () => {
  it('Should resolve refs', async () => {
    const schema = { test: '123', other: { $ref: '#/test' } };
    const result = await resolveRefs(schema);
    expect(result).toEqual({ other: '123', test: '123' });
  });

  it('Should resolve nested refs', async () => {
    const schema = {
      definitions: {
        a: { type: 'integer' },
        b: { $ref: '#/definitions/a' },
        c: { $ref: '#/definitions/b' },
      },
      $ref: '#/definitions/c',
    };
    const expected = {
      type: 'integer',
    };

    const result = await resolveRefs(schema);
    expect(result).toEqual(expected);
  });

  it('Should resolve nested refs', async () => {
    const schema = {
      $id: 'http://localhost:1234/tree',
      description: 'tree of nodes',
      type: 'object',
      properties: {
        meta: { type: 'string' },
        nodes: {
          type: 'array',
          items: { $ref: 'node' },
        },
      },
      required: ['meta', 'nodes'],
      definitions: {
        node: {
          $id: 'http://localhost:1234/node',
          description: 'node',
          type: 'object',
          properties: {
            value: { type: 'number' },
            subtree: { $ref: 'tree' },
          },
          required: ['value'],
        },
      },
    };

    const expected = {};

    const result = await resolveRefs(schema);
    expect(result).toEqual(expected);
  });

  it('Should resolve complex refs', async () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { $ref: '#/definitions/title' },
            id: { $ref: '#/definitions/id' },
            address: { $ref: '#/definitions/address' },
          },
        },
      },
      definitions: {
        title: {
          type: 'string',
          pattern: '^[A-Z]',
        },
        address: {
          type: 'object',
          properties: {
            id: { $ref: '#/definitions/id' },
            street: { $ref: '#/definitions/title' },
            price: { $ref: '#/definitions/test~1slash' },
            town: { $ref: '#/definitions/test~0tilde' },
            num: { $ref: '#/definitions/test%25percent' },
          },
        },
        'test/slash': {
          type: 'number',
        },
        'test~tilde': {
          type: 'string',
        },
        'test%percent': {
          type: 'integer',
        },
        id: {
          type: 'string',
          minLength: 3,
          maxLength: 4,
        },
      },
    };
    const expected = {
      definitions: {
        address: {
          properties: {
            id: {
              maxLength: 4,
              minLength: 3,
              type: 'string',
            },
            street: {
              pattern: '^[A-Z]',
              type: 'string',
            },
            price: { type: 'number' },
            num: { type: 'integer' },
            town: { type: 'string' },
          },
          type: 'object',
        },
        id: {
          maxLength: 4,
          minLength: 3,
          type: 'string',
        },
        title: { pattern: '^[A-Z]', type: 'string' },
        'test/slash': { type: 'number' },
        'test~tilde': { type: 'string' },
        'test%percent': { type: 'integer' },
      },
      properties: {
        user: {
          properties: {
            address: {
              properties: {
                id: {
                  maxLength: 4,
                  minLength: 3,
                  type: 'string',
                },
                street: {
                  pattern: '^[A-Z]',
                  type: 'string',
                },
                price: { type: 'number' },
                num: { type: 'integer' },
                town: { type: 'string' },
              },
              type: 'object',
            },
            id: {
              maxLength: 4,
              minLength: 3,
              type: 'string',
            },
            name: {
              pattern: '^[A-Z]',
              type: 'string',
            },
          },
          type: 'object',
        },
      },
      type: 'object',
    };

    const result = await resolveRefs(schema);
    expect(result).toEqual(expected);
  });

  it('Should resolve url refs', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' } });

    const schema = { test: '123', other: { $ref: 'http://example.test/schema#/test' } };
    const result = await resolveRefs(schema);
    expect(result).toEqual({ other: { type: 'number' }, test: '123' });
  });

  it('Should resolve multiple refs with one load', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' }, other: { type: 'array' } });

    const schema = {
      test: { $ref: 'http://example.test/schema#/test' },
      other: { $ref: 'http://example.test/schema#/other' },
    };

    const result = await resolveRefs(schema);
    expect(result).toEqual({ other: { type: 'array' }, test: { type: 'number' } });
  });

  it('Should resolve nested refs', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' }, other: { type: 'array' } })
      .get('/other-schema')
      .reply(200, { last: { type: 'object' } });

    const schema = {
      test: { $ref: 'http://example.test/schema#/test' },
      other: { $ref: 'http://example.test/schema#/other' },
      last: { $ref: 'http://example.test/other-schema#/last' },
    };

    const result = await resolveRefs(schema);

    expect(result).toEqual({
      other: { type: 'array' },
      test: { type: 'number' },
      last: { type: 'object' },
    });
  });
});
