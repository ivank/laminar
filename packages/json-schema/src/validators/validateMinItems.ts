import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMinItems: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) && schema.minItems && Array.isArray(value) && value.length < schema.minItems
    ? HasError('minItems', name, schema.minItems)
    : NoErrors;
