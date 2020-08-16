import { Validator, error, empty } from '../validation';

export const validatePattern: Validator = (schema, value, { name }) =>
  schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)
    ? error('pattern', name, schema.pattern)
    : empty;
