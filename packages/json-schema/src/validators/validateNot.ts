import { HasError, isJsonSchema, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateNot: Validator = (schema, value, options) =>
  isJsonSchema(schema) &&
  schema.not &&
  validateSchema(schema.not, value, options).errors.length === 0
    ? HasError('not', options.name)
    : NoErrors;
