import { Validator, error, empty } from '../validation';
import { validateExclusiveMaximum } from './validateExclusiveMaximum';

export const validateMaximum: Validator = (schema, value, options) => {
  if (schema.maximum !== undefined) {
    if (schema.exclusiveMaximum === true) {
      return validateExclusiveMaximum({ exclusiveMaximum: schema.maximum }, value, options);
    } else if (typeof value === 'number' && value > schema.maximum) {
      return error('maximum', options.name, schema.maximum);
    }
  }
  return empty;
};
