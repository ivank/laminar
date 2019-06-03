import { HasErrors, isObject, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMaxProperties: Validator = (schema, value, { name }) =>
  schema.maxProperties && isObject(value) && Object.keys(value).length > schema.maxProperties
    ? HasErrors([{ name, code: 'maxProperties', param: schema.maxProperties }])
    : NoErrors;
