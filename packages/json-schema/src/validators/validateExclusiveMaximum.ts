import { Validator, error, empty } from '../validation';

export const validateExclusiveMaximum: Validator = (schema, value, { name }) =>
  typeof schema.exclusiveMaximum === 'number' && typeof value === 'number' && value >= schema.exclusiveMaximum
    ? error('exclusiveMaximum', name, schema.exclusiveMaximum)
    : empty;
