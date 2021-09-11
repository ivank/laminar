import { Coercer } from '../coercion';

export const coerceDefault: Coercer = (schema, value) =>
  'default' in schema && value === undefined ? schema.default : value;
