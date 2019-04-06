import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateExclusiveMinimum: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  typeof schema.exclusiveMinimum === 'number' &&
  value <= schema.exclusiveMinimum
    ? HasError('exclusiveMinimum', name, schema.exclusiveMinimum)
    : NoErrors;
