import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';
import { validateExclusiveMinimum } from './validateExclusiveMinimum';

export const validateMinimum: Validator = (schema, value, options) => {
  if (schema.minimum !== undefined) {
    if (schema.exclusiveMinimum === true) {
      return validateExclusiveMinimum({ exclusiveMinimum: schema.minimum }, value, options);
    } else if (value < schema.minimum) {
      return HasError('minimum', options.name, schema.minimum);
    }
  }
  return NoErrors;
};
