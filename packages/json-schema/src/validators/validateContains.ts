import { Validator, childOptions, validateSchema, hasErrors, error, empty } from '../validation';

export const validateContains: Validator = (schema, value, options) => {
  if (schema.contains !== undefined && Array.isArray(value)) {
    const { contains, maxContains = value.length, minContains = 1 } = schema;

    const results = value.map((item, index) =>
      validateSchema(contains, item, childOptions(index, options)),
    );

    const containsCount = results.filter((result) => !hasErrors(result)).length;
    if (containsCount > maxContains || containsCount < minContains) {
      return error('contains', options.name);
    }
  }

  return empty;
};
