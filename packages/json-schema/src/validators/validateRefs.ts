import { isRefSchema } from '@ovotech/json-refs';
import { NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateRef: Validator = (schema, value, options) =>
  isRefSchema(schema) ? validateSchema(options.refs[schema.$ref], value, options) : NoErrors;
