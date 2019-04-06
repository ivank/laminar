import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMaxLength: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.maxLength &&
  typeof value === 'string' &&
  [...value].length > schema.maxLength
    ? HasError('maxLength', name, schema.maxLength)
    : NoErrors;
