import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateExclusiveMinimum: Validator = (schema, value, { name }) =>
  typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum
    ? HasError('exclusiveMinimum', name, schema.exclusiveMinimum)
    : NoErrors;
