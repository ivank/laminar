import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';
import { validateExclusiveMaximum } from './validateExclusiveMaximum';

export const validateMaximum: Validator = (schema, value, options) => {
  if (schema.maximum !== undefined) {
    if (schema.exclusiveMaximum === true) {
      return validateExclusiveMaximum({ exclusiveMaximum: schema.maximum }, value, options);
    } else if (typeof value === 'number' && value > schema.maximum) {
      return HasError('maximum', options.name, schema.maximum);
    }
  }
  return NoErrors;
};
