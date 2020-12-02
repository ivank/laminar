import { validateSchema, Validator, error, empty, combine, childOptions } from '../validation';
import { isObject } from '../helpers';

export const validateDependencies: Validator = ({ dependencies }, value, options) => {
  if (dependencies && isObject(value)) {
    return combine(
      Object.entries(dependencies)
        .filter(([key]) => key in value)
        .map(([key, dependency]) => {
          if (Array.isArray(dependency)) {
            const missing = dependency.filter((item) => !Object.keys(value).includes(item));
            return missing.length > 0 ? error('dependencies', `${options.name}.${key}`, missing) : empty;
          } else {
            return validateSchema(dependency, value, childOptions(key, options));
          }
        }),
    );
  }
  return empty;
};
