import { Validator, hasErrors, validateSchema, combine, error, empty } from '../validation';

export const validateAnyOf: Validator = (schema, value, options) => {
  if (schema.anyOf && schema.anyOf.length > 0) {
    if (schema.anyOf.length === 1) {
      return validateSchema(schema.anyOf[0], value, options);
    } else {
      const anyOfResults = schema.anyOf
        .map((item) => validateSchema(item, value, options))
        .filter((validation) => !hasErrors(validation));

      return anyOfResults.length ? combine(anyOfResults) : error('anyOf', options.name);
    }
  }
  return empty;
};
