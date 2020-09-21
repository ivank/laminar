import { Validator, hasErrors, validateSchema, combine, error, empty, errors } from '../validation';

export const validateAnyOf: Validator = (schema, value, options) => {
  if (schema.anyOf && schema.anyOf.length > 0) {
    if (schema.anyOf.length === 1) {
      return validateSchema(schema.anyOf[0], value, options);
    } else {
      const anyOfResults = schema.anyOf.map((item) => validateSchema(item, value, options));

      const noErrorResults = anyOfResults.filter((validation) => !hasErrors(validation));

      return noErrorResults.length
        ? combine(noErrorResults)
        : error('anyOf', options.name, anyOfResults.map(errors));
    }
  }
  return empty;
};
