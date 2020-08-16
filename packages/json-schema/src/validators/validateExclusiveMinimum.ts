import { Validator, error, empty } from '../validation';

export const validateExclusiveMinimum: Validator = (schema, value, { name }) =>
  typeof schema.exclusiveMinimum === 'number' &&
  typeof value === 'number' &&
  value <= schema.exclusiveMinimum
    ? error('exclusiveMinimum', name, schema.exclusiveMinimum)
    : empty;
