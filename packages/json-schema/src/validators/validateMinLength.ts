import { Validator, error, empty } from '../validation';

export const validateMinLength: Validator = (schema, value, { name }) =>
  schema.minLength && typeof value === 'string' && [...value].length < schema.minLength
    ? error('minLength', name, schema.minLength)
    : empty;
