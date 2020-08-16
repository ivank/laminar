import { Validator, empty } from '../validation';
import { validateEnum } from './validateEnum';

export const validateConst: Validator = (schema, value, options) =>
  schema.const !== undefined ? validateEnum({ enum: [schema.const] }, value, options) : empty;
