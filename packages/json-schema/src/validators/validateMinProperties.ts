import { Validator, error, empty } from '../validation';
import { isObject } from '../helpers';

export const validateMinProperties: Validator = (schema, value, { name }) =>
  schema.minProperties !== undefined &&
  isObject(value) &&
  Object.keys(value).length < schema.minProperties
    ? error('minProperties', name, schema.minProperties)
    : empty;
