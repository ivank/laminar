import { Validator, hasErrors, error, empty, validateSchema } from '../validation';

export const validateNot: Validator = (schema, value, options) =>
  schema.not && !hasErrors(validateSchema(schema.not, value, options))
    ? error('not', options.name)
    : empty;
