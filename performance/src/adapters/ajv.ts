import * as Ajv from 'ajv';
import fetch from 'node-fetch';
import { Adapter } from '../types';

const ajv = new Ajv({
  loadSchema: async (uri) => {
    const result = await fetch(uri);
    return await result.json();
  },
});

export const adapter: Adapter = {
  name: 'Ajv',
  compile: async (schema) => {
    const compiled = await ajv.compileAsync(schema);
    return (data) => compiled(data) as boolean;
  },
};
