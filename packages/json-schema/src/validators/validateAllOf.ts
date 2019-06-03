import { CombineResults, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateAllOf: Validator = (schema, value, options) =>
  schema.allOf
    ? CombineResults(schema.allOf.map(item => validateSchema(item, value, options)))
    : NoErrors;
