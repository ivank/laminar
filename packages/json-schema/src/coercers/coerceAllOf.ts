import { Coercer, coerceSchema } from '../coercion';

export const coerceAllOf: Coercer = (schema, value, options) =>
  schema.allOf ? schema.allOf.reduce((current, item) => coerceSchema(item, current, options), value) : value;
