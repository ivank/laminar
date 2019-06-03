import { childOptions, flatten, isObject, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validatePropertyNames: Validator = (schema, value, options) => {
  if (schema.propertyNames !== undefined && isObject(value)) {
    const { propertyNames } = schema;
    return flatten(
      Object.keys(value).map(key => validateSchema(propertyNames, key, childOptions(key, options))),
    );
  }
  return NoErrors;
};
