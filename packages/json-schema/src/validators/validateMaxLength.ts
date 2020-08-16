import { Validator, error, empty } from '../validation';

export const validateMaxLength: Validator = (schema, value, { name }) =>
  schema.maxLength && typeof value === 'string' && [...value].length > schema.maxLength
    ? error('maxLength', name, schema.maxLength)
    : empty;
