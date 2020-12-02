import { isObject } from '../helpers';
import { Validator, error, empty } from '../validation';

export const validateMaxProperties: Validator = (schema, value, { name }) =>
  schema.maxProperties !== undefined && isObject(value) && Object.keys(value).length > schema.maxProperties
    ? error('maxProperties', name, schema.maxProperties)
    : empty;
