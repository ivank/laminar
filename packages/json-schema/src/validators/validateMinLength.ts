import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMinLength: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.minLength &&
  typeof value === 'string' &&
  [...value].length < schema.minLength
    ? HasError('minLength', name, schema.minLength)
    : NoErrors;
