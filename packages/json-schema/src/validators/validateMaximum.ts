import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';
import { validateExclusiveMaximum } from './validateExclusiveMaximum';

export const validateMaximum: Validator = (schema, value, options) => {
  if (isJsonSchema(schema) && schema.maximum !== undefined) {
    if (schema.exclusiveMaximum === true) {
      return validateExclusiveMaximum({ exclusiveMaximum: schema.maximum }, value, options);
    } else if (value > schema.maximum) {
      return HasError('maximum', options.name, schema.maximum);
    }
  }
  return NoErrors;
};
