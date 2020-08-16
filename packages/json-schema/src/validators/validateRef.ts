import { Validator, validateSchema, empty } from '../validation';

export const validateRef: Validator = ({ $ref }, value, options) =>
  $ref ? validateSchema(options.refs[$ref], value, options) : empty;
