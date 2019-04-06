import { isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';
import { validateEnum } from './validateEnum';

export const validateConst: Validator = (schema, value, options) =>
  isJsonSchema(schema) && schema.const !== undefined
    ? validateEnum({ enum: [schema.const] }, value, options)
    : NoErrors;
