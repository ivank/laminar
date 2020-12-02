import { isObject } from '../helpers';
import {
  Validator,
  reduce,
  validateSchema,
  error,
  empty,
  childOptions,
  onlyErrors,
  evaluateProperty,
  hasEvaluatedProperty,
} from '../validation';

export const validateUnevaluatedProperties: Validator = ({ unevaluatedProperties }, value, options) => {
  if (unevaluatedProperties !== undefined && isObject(value)) {
    return reduce((key) => {
      if (hasEvaluatedProperty(key, options)) {
        return empty;
      } else if (unevaluatedProperties === false) {
        return error('unevaluatedProperties', options.name, key);
      } else {
        return evaluateProperty(
          key,
          onlyErrors(validateSchema(unevaluatedProperties, value[key], childOptions(key, options))),
        );
      }
    }, Object.keys(value));
  }
  return empty;
};
