import { Validator, hasErrors, error, empty, validateSchema, errors } from '../validation';

export const validateOneOf: Validator = (schema, value, options) => {
  if (schema.oneOf && schema.oneOf.length > 0) {
    const { oneOf } = schema;
    if (oneOf.length === 1) {
      return validateSchema(oneOf[0], value, options);
    }

    const validations = oneOf.map((item) => validateSchema(item, value, options));
    const matching = validations.filter((item) => !hasErrors(item));

    return matching.length === 1 ? matching[0] : error('oneOf', options.name, validations.map(errors));
  }
  return empty;
};
