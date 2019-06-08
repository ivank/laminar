import * as Ajv from 'ajv';
import fetch from 'node-fetch';
import { Adapter } from '../json-schema';

const ajv = new Ajv({
  loadSchema: async uri => {
    const result = await fetch(uri);
    return await result.json();
  },
});

export const adapter: Adapter = {
  name: 'Ajv',
  compile: schema => ajv.compileAsync(schema) as Promise<Ajv.ValidateFunction>,
  validate: (compiled, data: any) => compiled(data),
};
