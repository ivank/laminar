import { isObject } from '../helpers';
import { Validator, childOptions, combine, validateSchema, empty } from '../validation';

export const validatePropertyNames: Validator = ({ propertyNames }, value, options) => {
  if (propertyNames !== undefined && isObject(value)) {
    return combine(Object.keys(value).map((key) => validateSchema(propertyNames, key, childOptions(key, options))));
  }
  return empty;
};
