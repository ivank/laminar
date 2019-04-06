import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMaxItems: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) && schema.maxItems && Array.isArray(value) && value.length > schema.maxItems
    ? HasError('maxItems', name, schema.maxItems)
    : NoErrors;
