import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validatePattern: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.pattern &&
  typeof value === 'string' &&
  !new RegExp(schema.pattern).test(value)
    ? HasError('pattern', name, schema.pattern)
    : NoErrors;
