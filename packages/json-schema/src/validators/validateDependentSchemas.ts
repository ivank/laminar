import { Validator, empty, validateSchema, childOptions, combine } from '../validation';
import { isObject } from '../helpers';

export const validateDependentSchemas: Validator = ({ dependentSchemas }, value, options) => {
  if (dependentSchemas && isObject(value)) {
    return combine(
      Object.entries(dependentSchemas)
        .filter(([key]) => key in value)
        .map(([key, dependency]) => validateSchema(dependency, value, childOptions(key, options))),
    );
  }
  return empty;
};
