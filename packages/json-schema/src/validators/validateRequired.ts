import { isObject } from '../helpers';
import { Validator, empty, error } from '../validation';

export const validateRequired: Validator = ({ required }, value, { name }) => {
  if (required && required.length && isObject(value)) {
    const missingKeys = required.filter((key) => !Object.keys(value).includes(key));
    if (missingKeys.length > 0) {
      return error('required', name, missingKeys);
    }
  }
  return empty;
};
