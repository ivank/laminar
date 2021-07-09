import nock from 'nock';
import { Schema } from '../src';
import { extractUrls, RefMap, extractNamedRefs, extractFiles, resolve } from '../src/resolve';

describe('json-refs', () => {
  it.each<[string, Schema, string[]]>([
    ['no ref', { $ref: '#/$defs/test', $defs: { test: { maximum: 10 } } }, []],
    ['single ref', { $ref: 'http://one.test#/test' }, ['http://one.test/']],
    [
      'nested multiple ref',
      {
        properties: {
          test: { $ref: 'http://one.test#/test' },
          other: { properties: { deep: { $ref: 'http://two.test#/test' } } },
        },
      },
      ['http://one.test/', 'http://two.test/'],
    ],
    [
      'nested multiple ref with ids',
      {
        $id: 'http://one.test',
        properties: {
          test: { $ref: 'first#/test' },
          other: { properties: { deep: { $ref: 'second#/test' } } },
        },
      },
      ['http://one.test/first', 'http://one.test/second'],
    ],
    [
      'nested multiple ref with ids old style',
      {
        id: 'http://one.test',
        properties: {
          test: { $ref: 'first#/test' },
          other: { properties: { deep: { $ref: 'second#/test' } } },
        },
      },
      ['http://one.test/first', 'http://one.test/second'],
    ],
    [
      'nested multiple refs and different ids',
      {
        properties: {
          one: {
            $id: 'http://one.test',
            properties: { test: { $ref: 'first#/test-1' } },
          },
          two: {
            $id: 'http://two.test',
            properties: { deep: { properties: { other: { $ref: 'second#/test-2' } } } },
          },
          standAlone: { $ref: 'http://three.test' },
        },
      },
      ['http://one.test/first', 'http://two.test/second', 'http://three.test/'],
    ],
  ])('Should extractUrls for %s', (_, schema, expected) => {
    expect(extractUrls(schema)).toEqual(expected);
  });

  it.each<[string, Schema, RefMap]>([
    [
      'single id',
      { $id: 'http://one.test', minimum: 12 },
      { 'http://one.test/': { $id: 'http://one.test', minimum: 12 } },
    ],
    [
      'nested id',
      {
        $id: 'http://one.test',
        minimum: 12,
        properties: { deep: { $id: 'other', maximum: 22 } },
      },
      {
        'http://one.test/': {
          $id: 'http://one.test',
          minimum: 12,
          properties: { deep: { $id: 'other', maximum: 22 } },
        },
        'http://one.test/other': { $id: 'other', maximum: 22 },
      },
    ],
  ])('Should extractNamedRefs for %s', (_, schema, expected) => {
    expect(extractNamedRefs(schema)).toEqual(expected);
  });

  it('Should extract multiple urls', async () => {
    const schema = {
      properties: {
        test: { $ref: 'http://one.test#/test' },
        other: {
          properties: {
            deep: { $ref: 'http://two.test/folder#/test' },
          },
        },
        last: {
          $id: 'http://two.test',
          properties: {
            deep: {
              $ref: 'folder',
            },
          },
        },
      },
    };

    nock('http://one.test').get('/').reply(200, { $ref: 'http://three.test#' });

    nock('http://two.test').get('/folder').reply(200, { test: 2 });

    nock('http://three.test').get('/').reply(200, { $ref: 'http://four.test#/test', test: 3 });

    nock('http://four.test').get('/').reply(200, { test: 4 });

    const expected = {
      refs: {
        'http://two.test/': { $id: 'http://two.test', properties: { deep: { $ref: 'folder' } } },
        'http://four.test/': { test: 4 },
        'http://four.test/#/test': 4,
        'http://three.test/': { $ref: 'http://four.test/#/test', test: 3 },
        'http://three.test/#': { $ref: 'http://four.test/#/test', test: 3 },
        'http://one.test/': { $ref: 'http://three.test/#' },
        'http://two.test/folder': { test: 2 },
      },
      uris: ['http://four.test/', 'http://three.test/', 'http://one.test/', 'http://two.test/folder'],
    };

    expect(await extractFiles(schema)).toEqual(expected);
  });

  it('Should resolve simple nested refs', async () => {
    const schema: Schema = {
      $defs: {
        a: { type: 'integer' as const },
        b: { $ref: '#/$defs/a' },
        c: { $ref: '#/$defs/b' },
      },
      $ref: '#/$defs/c',
    };

    const expected = {
      schema: {
        $ref: '#/$defs/c',
        $defs: {
          a: { type: 'integer' as const },
          b: { $ref: '#/$defs/a' },
          c: { $ref: '#/$defs/b' },
        },
      },
      refs: {
        '#/$defs/a': { type: 'integer' },
        '#/$defs/b': { $ref: '#/$defs/a' },
        '#/$defs/c': { $ref: '#/$defs/b' },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve anchors with id', async () => {
    const schema = {
      $defs: {
        A: { $anchor: 'foo', $id: 'http://localhost:1234/bar', type: 'integer' as const },
      },
      $ref: 'http://localhost:1234/bar#foo',
    };

    const expected = {
      schema: {
        $ref: 'http://localhost:1234/bar#foo',
        $defs: {
          A: { $anchor: 'foo', $id: 'http://localhost:1234/bar', type: 'integer' as const },
        },
      },
      refs: {
        'http://localhost:1234/bar#foo': {
          $anchor: 'foo',
          $id: 'http://localhost:1234/bar',
          type: 'integer',
        },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });
  it('Should resolve anchors with nested id', async () => {
    const schema = {
      $defs: {
        A: { $defs: { B: { $anchor: 'foo', type: 'integer' as const } }, $id: 'nested.json' },
      },
      $id: 'http://localhost:1234/root',
      $ref: 'http://localhost:1234/nested.json#foo',
    };

    const expected = {
      schema: {
        $defs: {
          A: { $defs: { B: { $anchor: 'foo', type: 'integer' as const } }, $id: 'nested.json' },
        },
        $id: 'http://localhost:1234/root',
        $ref: 'http://localhost:1234/nested.json#foo',
      },
      refs: {
        'http://localhost:1234/root': {
          $defs: {
            A: { $defs: { B: { $anchor: 'foo', type: 'integer' as const } }, $id: 'nested.json' },
          },
          $id: 'http://localhost:1234/root',
          $ref: 'http://localhost:1234/nested.json#foo',
        },
        'http://localhost:1234/nested.json': {
          $defs: { B: { $anchor: 'foo', type: 'integer' } },
          $id: 'nested.json',
        },
        'http://localhost:1234/nested.json#foo': { $anchor: 'foo', type: 'integer' as const },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve simple anchors', async () => {
    const schema = { $defs: { A: { $anchor: 'foo', type: 'integer' as const } }, $ref: '#foo' };

    const expected = {
      schema: {
        $defs: { A: { $anchor: 'foo', type: 'integer' as const } },
        $ref: '#foo',
      },
      refs: {
        '#foo': { $anchor: 'foo', type: 'integer' },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve recursiveRef', async () => {
    const schema = {
      $id: 'http://localhost:1234',
      $recursiveAnchor: true,
      type: 'object' as const,
      properties: {
        myprop: {
          anyOf: [
            { type: 'string' as const },
            { type: 'object' as const, additionalProperties: { $recursiveRef: '#' } },
          ],
        },
      },
    };

    const expected = {
      schema: {
        $id: 'http://localhost:1234',
        $recursiveAnchor: true,
        type: 'object',
        properties: {
          myprop: {
            anyOf: [{ type: 'string' }, { type: 'object', additionalProperties: { $ref: 'http://localhost:1234#' } }],
          },
        },
      },
      refs: {
        'http://localhost:1234#': {
          $id: 'http://localhost:1234',
          $recursiveAnchor: true,
          type: 'object',
          properties: {
            myprop: {
              anyOf: [{ type: 'string' }, { type: 'object', additionalProperties: { $ref: 'http://localhost:1234#' } }],
            },
          },
        },
        'http://localhost:1234/': {
          $id: 'http://localhost:1234',
          $recursiveAnchor: true,
          type: 'object',
          properties: {
            myprop: {
              anyOf: [{ type: 'string' }, { type: 'object', additionalProperties: { $ref: 'http://localhost:1234#' } }],
            },
          },
        },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve location independent definitiions', async () => {
    const schema = {
      allOf: [{ $ref: 'http://localhost:1234/bar#foo' }],
      $defs: { A: { $id: 'http://localhost:1234/bar#foo', type: 'integer' as const } },
    };

    const expected = {
      schema: {
        allOf: [{ $ref: 'http://localhost:1234/bar#foo' }],
        $defs: { A: { $id: 'http://localhost:1234/bar#foo', type: 'integer' } },
      },
      refs: {
        'http://localhost:1234/bar#foo': { $id: 'http://localhost:1234/bar#foo', type: 'integer' },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve location independent definitiions with only url id', async () => {
    const schema: Schema = {
      allOf: [{ $ref: '#foo' }],
      $defs: { A: { $id: '#foo', type: 'integer' as const } },
    };

    const expected = {
      schema: {
        allOf: [{ $ref: '#foo' }],
        $defs: { A: { $id: '#foo', type: 'integer' } },
      },
      refs: {
        '#foo': { $id: '#foo', type: 'integer' },
      },
      uris: [],
    };

    expect(await resolve(schema)).toEqual(expected);
  });

  it('Should resolve nested recursive with files', async () => {
    const schema: Schema = {
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
      $defs: {
        node: {
          $id: 'http://localhost:1234/node',
          description: 'node',
          type: 'object' as const,
          properties: {
            value: { type: 'number' as const },
            subtree: { $ref: 'tree' },
          },
          required: ['value'],
        },
      },
    };

    expect(await resolve(schema)).toMatchSnapshot();
  });

  it('Should resolve complex refs', async () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        mangled: { $ref: '#/$defs/unknown/more-unknown' },
        user: {
          type: 'object',
          properties: {
            name: { $ref: '#/$defs/title' },
            id: { $ref: '#/$defs/id' },
            address: { $ref: '#/$defs/address' },
          },
        },
      },
      $defs: {
        title: {
          type: 'string',
          pattern: '^[A-Z]',
        },
        address: {
          type: 'object',
          properties: {
            id: { $ref: '#/$defs/id' },
            street: { $ref: '#/$defs/title' },
            price: { $ref: '#/$defs/test~1slash' },
            town: { $ref: '#/$defs/test~0tilde' },
            num: { $ref: '#/$defs/test%25percent' },
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

    expect(await resolve(schema)).toMatchSnapshot();
  });

  it('Should resolve url refs', async () => {
    nock('http://example.test')
      .get('/schema')
      .reply(200, { test: { type: 'number' } });

    const schema = {
      test: '123',
      properties: { other: { $ref: 'http://example.test/schema#/test' } },
    };
    expect(await resolve(schema)).toEqual({
      schema: { properties: { other: { $ref: 'http://example.test/schema#/test' } }, test: '123' },
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
    const schema = { properties: { test: { $ref: 'assets/test.json#/UserResponse' } } };

    expect(await resolve(schema, { cwd: __dirname })).toEqual({
      schema: { properties: { test: { $ref: 'assets/test.json#/UserResponse' } } },
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

  it('Should resolve local refs with file:://', async () => {
    const schema = { properties: { test: { $ref: 'file://./assets/test.json#/UserResponse' } } };

    expect(await resolve(schema, { cwd: __dirname })).toEqual({
      schema: { properties: { test: { $ref: 'file://./assets/test.json#/UserResponse' } } },
      refs: {
        'file://./assets/test.json': {
          UserResponse: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
        'file://./assets/test.json#/UserResponse': {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
      },
      uris: [expect.stringContaining('file://')],
    });
  });

  it('Should resolve local refs from yaml', async () => {
    const schema = { properties: { test: { $ref: 'assets/test.yaml#/UserResponse' } } };

    expect(await resolve(schema, { cwd: __dirname })).toEqual({
      schema: { properties: { test: { $ref: 'assets/test.yaml#/UserResponse' } } },
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
      properties: { test: { $ref: 'assets/test.yml#/UserResponse' } },
    };

    expect(await resolve(schema, { cwd: __dirname })).toEqual({
      schema: { properties: { test: { $ref: 'assets/test.yml#/UserResponse' } } },
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
      properties: {
        test: { $ref: 'http://example.test/schema#/test' },
        other: { $ref: 'http://example.test/schema#/other' },
      },
    };

    expect(await resolve(schema)).toEqual({
      schema: {
        properties: {
          test: { $ref: 'http://example.test/schema#/test' },
          other: { $ref: 'http://example.test/schema#/other' },
        },
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

    const schema: Schema = {
      properties: {
        test: { $ref: 'http://example.test/schema#/test' },
        other: { $ref: 'http://example.test/schema#/other' },
        last: { $ref: 'http://example.test/other-schema#/last' },
      },
    };

    expect(await resolve(schema)).toEqual({
      schema: {
        properties: {
          test: { $ref: 'http://example.test/schema#/test' },
          other: { $ref: 'http://example.test/schema#/other' },
          last: { $ref: 'http://example.test/other-schema#/last' },
        },
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
    const schema = { properties: { foo: { $ref: '#' } }, additionalProperties: false };

    const schema1 = await resolve(schema);
    const schema2 = await resolve(schema);

    expect(schema1).toEqual(schema2);
  });
});
