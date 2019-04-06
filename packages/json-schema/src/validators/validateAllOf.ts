import { CombineResults, isJsonSchema, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateAllOf: Validator = (schema, value, options) =>
  isJsonSchema(schema) && schema.allOf
    ? CombineResults(schema.allOf.map(item => validateSchema(item, value, options)))
    : NoErrors;
