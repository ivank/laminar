import { Validator, error, empty } from '../validation';

export const validateMaxItems: Validator = (schema, value, { name }) =>
  schema.maxItems && Array.isArray(value) && value.length > schema.maxItems
    ? error('maxItems', name, schema.maxItems)
    : empty;
