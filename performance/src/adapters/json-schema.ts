import { compile, validateCompiled } from '@ovotech/json-schema';
import { Adapter } from '../types';

export const adapter: Adapter = {
  name: '@ovotech/json-schema',
  compile: async (schema) => {
    const compiled = await compile(schema);
    return (data) => validateCompiled({ schema: compiled, value: data, draft: 'draft7' }).valid;
  },
};
