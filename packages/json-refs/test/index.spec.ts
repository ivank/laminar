import * as nock from 'nock';
import { extractFiles, extractNamedRefs, extractUrls, resolveRefs, JsonObject } from '../src';

describe('json-refs', () => {
  it.each<[string, JsonObject, string[]]>([
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

  it.each<[string, JsonObject, JsonObject]>([
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

    nock('http://one.test').get('/').reply(200, { $ref: 'http://three.test#' });

    nock('http://two.test').get('/folder').reply(200, { test: 2 });

    nock('http://three.test').get('/').reply(200, { $ref: 'http://four.test#/test', test: 3 });

    nock('http://four.test').get('/').reply(200, { test: 4 });

    const expected = {
      refs: {
        'http://two.test/': { $id: 'http://two.test', deep: { $ref: 'folder' } },
        'http://four.test/': { test: 4 },
        'http://four.test/#/test': 4,
        'http://three.test/': { $ref: 'http://four.test/#/test' },
        'http://three.test/#': { $ref: 'http://four.test/#/test' },
        'http://one.test/': { $ref: 'http://three.test/#' },
        'http://two.test/folder': { test: 2 },
      },
      uris: [
        'http://four.test/',
        'http://three.test/',
        'http://one.test/',
        'http://two.test/folder',
      ],
    };

    expect(await extractFiles(schema)).toEqual(expected);
  });

  it('Should resolve simple nested refs', async () => {
    const schema = {
      definitions: {
        a: { type: 'integer' },
        b: { $ref: '#/definitions/a' },
        c: { $ref: '#/definitions/b' },
      },
      $ref: '#/definitions/c',
    };

    const expected = {
      schema: {
        $ref: '#/definitions/c',
      },
      refs: {
        '#/definitions/a': { type: 'integer' },
        '#/definitions/b': { $ref: '#/definitions/a' },
        '#/definitions/c': { $ref: '#/definitions/b' },
      },
      uris: [],
    };

    expect(await resolveRefs(schema)).toEqual(expected);
  });

  it('Should resolve nested recursive with files', async () => {
    const schema: JsonObject = {
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

    expect(await resolveRefs(schema)).toMatchSnapshot();
  });

  it('Should resolve complex refs', async () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        mangled: { $ref: '#/definitions/unknown/more-unknown' },
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

    expect(await resolveRefs(schema)).toMatchSnapshot();
  });

  it('Should resolve url refs', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' } });

    const schema = { test: '123', other: { $ref: 'http://example.test/schema#/test' } };
    expect(await resolveRefs(schema)).toEqual({
      schema: { other: { $ref: 'http://example.test/schema#/test' }, test: '123' },
      refs: {
        'http://example.test/schema': {
          test: {
            type: 'number',
          },
        },
        'http://example.test/schema#/test': {
          type: 'number',
        },
      },
      uris: ['http://example.test/schema'],
    });
  });

  it('Should resolve local refs from json', async () => {
    const schema = {
      test: { $ref: 'assets/test.json#/UserResponse' },
    };

    expect(await resolveRefs(schema, { cwd: __dirname })).toEqual({
      schema: {
        test: { $ref: 'assets/test.json#/UserResponse' },
      },
      refs: {
        'assets/test.json': {
          UserResponse: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
        'assets/test.json#/UserResponse': {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
      },
      uris: [expect.stringContaining('file://')],
    });
  });

  it('Should resolve local refs from yaml', async () => {
    const schema = {
      test: { $ref: 'assets/test.yaml#/UserResponse' },
    };

    expect(await resolveRefs(schema, { cwd: __dirname })).toEqual({
      schema: {
        test: { $ref: 'assets/test.yaml#/UserResponse' },
      },
      refs: {
        'assets/test.yaml': {
          UserResponse: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
        'assets/test.yaml#/UserResponse': {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
      },
      uris: [expect.stringContaining('file://')],
    });
  });

  it('Should resolve local refs in nested files', async () => {
    const schema = {
      test: { $ref: 'assets/test.yml#/UserResponse' },
    };

    expect(await resolveRefs(schema, { cwd: __dirname })).toEqual({
      schema: {
        test: { $ref: 'assets/test.yml#/UserResponse' },
      },
      refs: {
        'test.json': {
          UserResponse: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
        'test.json#/UserResponse': {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
        'assets/test.yml': {
          UserResponse: {
            type: 'object',
            properties: { id: { $ref: 'test.json#/UserResponse' } },
          },
        },
        'assets/test.yml#/UserResponse': {
          type: 'object',
          properties: { id: { $ref: 'test.json#/UserResponse' } },
        },
      },
      uris: [expect.stringContaining('file://'), expect.stringContaining('file://')],
    });
  });

  it('Should resolve multiple refs with one load', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' }, other: { type: 'array' } });

    const schema = {
      test: { $ref: 'http://example.test/schema#/test' },
      other: { $ref: 'http://example.test/schema#/other' },
    };

    expect(await resolveRefs(schema)).toEqual({
      schema: {
        test: { $ref: 'http://example.test/schema#/test' },
        other: { $ref: 'http://example.test/schema#/other' },
      },
      refs: {
        'http://example.test/schema': { test: { type: 'number' }, other: { type: 'array' } },
        'http://example.test/schema#/test': { type: 'number' },
        'http://example.test/schema#/other': { type: 'array' },
      },
      uris: ['http://example.test/schema'],
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

    expect(await resolveRefs(schema)).toEqual({
      schema: {
        test: { $ref: 'http://example.test/schema#/test' },
        other: { $ref: 'http://example.test/schema#/other' },
        last: { $ref: 'http://example.test/other-schema#/last' },
      },
      refs: {
        'http://example.test/schema': { test: { type: 'number' }, other: { type: 'array' } },
        'http://example.test/other-schema': { last: { type: 'object' } },
        'http://example.test/schema#/test': { type: 'number' },
        'http://example.test/schema#/other': { type: 'array' },
        'http://example.test/other-schema#/last': { type: 'object' },
      },
      uris: ['http://example.test/schema', 'http://example.test/other-schema'],
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
});
