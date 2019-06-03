import { HasError, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateNot: Validator = (schema, value, options) =>
  schema.not && validateSchema(schema.not, value, options).length === 0
    ? HasError('not', options.name)
    : NoErrors;
