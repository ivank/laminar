import { compile } from '@ovotech/json-schema';
import { Adapter } from '..';

export const adapter: Adapter = {
  name: '@ovotech/json-schema',
  compile: schema => compile(schema),
  validate: (compiled, data: any) => compiled(data).valid,
};
