import nock = require('nock');
import { extractFiles, extractNamedRefs, extractUrls, resolveRefs } from '../src';

describe('json-refs', () => {
  it.each<[string, any, string[]]>([
    [
      'no ref',
      {
        $ref: '#/definition/test',
        definition: {
          test: { maximum: 10 },
        },
      },
      [],
    ],
    [
      'single ref',
      {
        $ref: 'http://one.test#/test',
      },
      ['http://one.test/'],
    ],
    [
      'nested multiple ref',
      {
        test: { $ref: 'http://one.test#/test' },
        other: {
          deep: { $ref: 'http://two.test#/test' },
        },
      },
      ['http://one.test/', 'http://two.test/'],
    ],
    [
      'nested multiple ref with ids',
      {
        $id: 'http://one.test',
        test: { $ref: 'first#/test' },
        other: {
          deep: { $ref: 'second#/test' },
        },
      },
      ['http://one.test/first', 'http://one.test/second'],
    ],
    [
      'nested multiple ref with ids old style',
      {
        id: 'http://one.test',
        test: { $ref: 'first#/test' },
        other: {
          deep: { $ref: 'second#/test' },
        },
      },
      ['http://one.test/first', 'http://one.test/second'],
    ],
    [
      'nested multiple refs and different ids',
      {
        one: {
          $id: 'http://one.test',
          test: { $ref: 'first#/test-1' },
        },
        two: {
          $id: 'http://two.test',
          deep: {
            other: { $ref: 'second#/test-2' },
          },
        },
        standAlone: { $ref: 'http://three.test' },
      },
      ['http://one.test/first', 'http://two.test/second', 'http://three.test/'],
    ],
  ])('Should extractUrls for %s', (_, schema, expected) => {
    expect(extractUrls(schema)).toEqual(expected);
  });

  it.each<[string, any, any]>([
    [
      'single id',
      {
        $id: 'http://one.test',
        minimum: 12,
      },
      { 'http://one.test/': { $id: 'http://one.test', minimum: 12 } },
    ],
    [
      'nested id',
      {
        $id: 'http://one.test',
        minimum: 12,
        deep: {
          $id: 'other',
          maximum: 22,
        },
      },
      {
        'http://one.test/': {
          $id: 'http://one.test',
          minimum: 12,
          deep: { $id: 'other', maximum: 22 },
        },
        'http://one.test/other': { $id: 'other', maximum: 22 },
      },
    ],
  ])('Should extractNamedRefs for %s', (_, schema, expected) => {
    expect(extractNamedRefs(schema)).toEqual(expected);
  });

  it('Should extract multiple urls', async () => {
    const schema = {
      test: { $ref: 'http://one.test#/test' },
      other: {
        deep: { $ref: 'http://two.test/folder#/test' },
      },
      last: {
        $id: 'http://two.test',
        deep: {
          $ref: 'folder',
        },
      },
    };

    nock('http://one.test')
      .get('/')
      .reply(200, { $ref: 'http://three.test#' });

    nock('http://two.test')
      .get('/folder')
      .reply(200, { test: 2 });

    nock('http://three.test')
      .get('/')
      .reply(200, { $ref: 'http://four.test#/test', test: 3 });

    nock('http://four.test')
      .get('/')
      .reply(200, { test: 4 });

    const expected = {
      'http://four.test/': { test: 4 },
      'http://three.test/': 4,
      'http://one.test/': 4,
      'http://two.test/folder': { test: 2 },
      'http://two.test/': { $id: 'http://two.test', deep: { $ref: 'folder' } },
    };

    await expect(extractFiles(schema)).resolves.toEqual(expected);
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

    await expect(resolveRefs(schema)).resolves.toEqual(expected);
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

    await expect(resolveRefs(schema)).resolves.toMatchSnapshot();
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

    await expect(resolveRefs(schema)).resolves.toEqual(expected);
  });

  it('Should resolve url refs', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' } });

    const schema = { test: '123', other: { $ref: 'http://example.test/schema#/test' } };
    await expect(resolveRefs(schema)).resolves.toEqual({ other: { type: 'number' }, test: '123' });
  });

  it('Should resolve multiple refs with one load', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' }, other: { type: 'array' } });

    const schema = {
      test: { $ref: 'http://example.test/schema#/test' },
      other: { $ref: 'http://example.test/schema#/other' },
    };

    await expect(resolveRefs(schema)).resolves.toEqual({
      other: { type: 'array' },
      test: { type: 'number' },
    });
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

    await expect(resolveRefs(schema)).resolves.toEqual({
      other: { type: 'array' },
      test: { type: 'number' },
      last: { type: 'object' },
    });
  });

  it('Should resolve recursive copy', async () => {
    const schema = {
      properties: {
        foo: { $ref: '#' },
      },
      additionalProperties: false,
    };

    const schema1 = await resolveRefs(schema);
    const schema2 = await resolveRefs(schema);

    expect(schema1).toEqual(schema2);
  });

  it('Should resolve complex refs and keep them', async () => {
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
              $_ref: '#/definitions/id',
              maxLength: 4,
              minLength: 3,
              type: 'string',
            },
            street: {
              $_ref: '#/definitions/title',
              pattern: '^[A-Z]',
              type: 'string',
            },
            price: { $_ref: '#/definitions/test~1slash', type: 'number' },
            num: { $_ref: '#/definitions/test%25percent', type: 'integer' },
            town: { $_ref: '#/definitions/test~0tilde', type: 'string' },
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
              $_ref: '#/definitions/address',
              properties: {
                id: {
                  $_ref: '#/definitions/id',
                  maxLength: 4,
                  minLength: 3,
                  type: 'string',
                },
                street: {
                  $_ref: '#/definitions/title',
                  pattern: '^[A-Z]',
                  type: 'string',
                },
                price: { $_ref: '#/definitions/test~1slash', type: 'number' },
                num: { $_ref: '#/definitions/test%25percent', type: 'integer' },
                town: { $_ref: '#/definitions/test~0tilde', type: 'string' },
              },
              type: 'object',
            },
            id: {
              $_ref: '#/definitions/id',
              maxLength: 4,
              minLength: 3,
              type: 'string',
            },
            name: {
              $_ref: '#/definitions/title',
              pattern: '^[A-Z]',
              type: 'string',
            },
          },
          type: 'object',
        },
      },
      type: 'object',
    };

    await expect(resolveRefs(schema, { keepRefAs: '$_ref' })).resolves.toEqual(expected);
  });
});
