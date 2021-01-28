import { validate, Schema } from '../src';

describe('Helper isEqual', () => {
  it('Should discriminate schema', async () => {
    const schema: Schema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: {
              enum: ['cat'],
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
              enum: ['dog'],
            },
          },
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    };

    const result = await validate({ schema, draft: 'openapi3', value: { type: 'cat', size: 'big' } });
    expect(result.errors).toEqual(['[value.size] (type) should be of type integer']);
  });

  it('Should use nullable keyword correctly', async () => {
    const schema: Schema = {
      type: 'integer',
      nullable: true,
    };

    const result1 = await validate({ schema, draft: 'openapi3', value: 10 });
    expect(result1.valid).toBe(true);

    const result2 = await validate({ schema, draft: 'openapi3', value: null });
    expect(result2.valid).toBe(true);

    const result3 = await validate({ schema, draft: 'openapi3', value: 'other' });
    expect(result3.errors).toEqual(['[value] (type) should be of type integer,null']);
  });

  it('Should not have additionalItems', async () => {
    const schema: Schema = {
      items: [{ type: 'integer' }, { type: 'string' }],
      additionalItems: { type: 'boolean' },
    };

    const result1 = await validate({ schema, draft: 'openapi3', value: [10, '20'] });
    expect(result1.valid).toBe(true);

    const result2 = await validate({ schema, draft: 'openapi3', value: ['10', '20'] });
    expect(result2.valid).toBe(false);

    const result3 = await validate({ schema, draft: 'openapi3', value: [10, '20', true] });
    expect(result3.valid).toBe(true);

    const result4 = await validate({ schema, draft: 'openapi3', value: [10, '20', '123'] });
    expect(result4.valid).toBe(true);
  });
});
