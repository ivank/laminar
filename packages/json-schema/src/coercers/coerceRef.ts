import { Coercer, coerceSchema } from '../coercion';

export const coerceRef: Coercer = ({ $ref }, value, options) =>
  $ref ? coerceSchema(options.refs[$ref], value, options) : value;
