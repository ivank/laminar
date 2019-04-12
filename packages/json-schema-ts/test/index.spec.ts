import { Schema } from '@ovotech/json-schema';
import { inspect } from 'util';
import { astToTS, jsonSchemaToAST, registryToTs } from '../src';

describe('Json Schema Ts', () => {
  it('Test', () => {
    const schema: Schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'array',
      items: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
    };

    const ast = jsonSchemaToAST(schema, { root: schema, registry: {} });
    console.log(inspect(ast, { depth: 10 }));
    console.log(astToTS(ast));
    console.log(ast.context.registry);
    console.log(registryToTs(ast.context.registry));
  });
});
