import { Validator, error, empty } from '../validation';
import { validateExclusiveMinimum } from './validateExclusiveMinimum';

export const validateMinimum: Validator = (schema, value, options) => {
  if (schema.minimum !== undefined) {
    if (schema.exclusiveMinimum === true) {
      return validateExclusiveMinimum({ exclusiveMinimum: schema.minimum }, value, options);
    } else if (typeof value === 'number' && value < schema.minimum) {
      return error('minimum', options.name, schema.minimum);
    }
  }
  return empty;
};
