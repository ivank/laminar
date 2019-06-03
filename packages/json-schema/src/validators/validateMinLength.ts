import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateMinLength: Validator = (schema, value, { name }) =>
  schema.minLength && typeof value === 'string' && [...value].length < schema.minLength
    ? HasError('minLength', name, schema.minLength)
    : NoErrors;
