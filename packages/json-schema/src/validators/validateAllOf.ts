import { Validator, empty, validateSchema, combine } from '../validation';

export const validateAllOf: Validator = (schema, value, options) =>
  schema.allOf ? combine(schema.allOf.map((item) => validateSchema(item, value, options), schema.allOf)) : empty;
