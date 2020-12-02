import { Validator, combine, error, empty } from '../validation';
import { isObject } from '../helpers';

export const validateDependentRequired: Validator = ({ dependentRequired }, value, options) => {
  if (dependentRequired && isObject(value)) {
    return combine(
      Object.entries(dependentRequired)
        .filter(([key]) => key in value)
        .map(([key, dependency]) => {
          const missing = dependency.filter((item) => !Object.keys(value).includes(item));
          return missing.length > 0 ? error('dependencies', `${options.name}.${key}`, missing) : empty;
        }),
    );
  }
  return empty;
};
