import { HasErrors, isJsonSchema, isObject, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMaxProperties: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.maxProperties &&
  isObject(value) &&
  Object.keys(value).length > schema.maxProperties
    ? HasErrors([{ name, code: 'maxProperties', param: schema.maxProperties }])
    : NoErrors;
