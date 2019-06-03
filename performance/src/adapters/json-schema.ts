import { compile, validateCompiled } from '@ovotech/json-schema';
import { Adapter } from '..';

export const adapter: Adapter = {
  name: '@ovotech/json-schema',
  compile: schema => compile(schema),
  validate: (compiled, data: any) => validateCompiled(compiled, data).valid,
};
