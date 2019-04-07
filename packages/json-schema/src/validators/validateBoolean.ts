import { NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateBoolean: Validator = (schema, value, options) =>
  schema === true
    ? { errors: [], valid: true }
    : schema === false
    ? { errors: [{ code: 'false', name: options.name, param: false }], valid: false }
    : NoErrors;
