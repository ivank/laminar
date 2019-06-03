import { HasErrors, isObject, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateRequired: Validator = (schema, value, { name }) => {
  if (schema.required && schema.required.length && isObject(value)) {
    const missingKeys = schema.required.filter(key => !Object.keys(value).includes(key));
    if (missingKeys.length > 0) {
      return HasErrors([{ name, code: 'required', param: missingKeys }]);
    }
  }
  return NoErrors;
};
