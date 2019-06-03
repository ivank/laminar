import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMaxItems: Validator = (schema, value, { name }) =>
  schema.maxItems && Array.isArray(value) && value.length > schema.maxItems
    ? HasError('maxItems', name, schema.maxItems)
    : NoErrors;
