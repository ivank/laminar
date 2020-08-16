import { Validator, validateSchema, empty, skipRest } from '../validation';

export const validateRefOnly: Validator = ({ $ref }, value, options) =>
  $ref ? skipRest(validateSchema(options.refs[$ref], value, options)) : empty;
