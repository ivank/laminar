import { Validator, error, empty } from '../validation';

export const validateMinItems: Validator = (schema, value, { name }) =>
  schema.minItems && Array.isArray(value) && value.length < schema.minItems
    ? error('minItems', name, schema.minItems)
    : empty;
