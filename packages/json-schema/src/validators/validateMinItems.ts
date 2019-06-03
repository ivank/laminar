import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMinItems: Validator = (schema, value, { name }) =>
  schema.minItems && Array.isArray(value) && value.length < schema.minItems
    ? HasError('minItems', name, schema.minItems)
    : NoErrors;
