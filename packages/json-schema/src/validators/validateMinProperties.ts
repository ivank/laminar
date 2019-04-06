import { HasError, isJsonSchema, isObject, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMinProperties: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.minProperties &&
  isObject(value) &&
  Object.keys(value).length < schema.minProperties
    ? HasError('minProperties', name, schema.minProperties)
    : NoErrors;
