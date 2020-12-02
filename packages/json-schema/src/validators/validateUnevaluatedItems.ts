import {
  Validator,
  childOptions,
  empty,
  reduce,
  validateSchema,
  error,
  onlyErrors,
  evaluateItem,
  hasEvaluatedItem,
} from '../validation';

export const validateUnevaluatedItems: Validator = ({ unevaluatedItems }, value, options) => {
  if (unevaluatedItems !== undefined && Array.isArray(value)) {
    return reduce((item, index) => {
      if (hasEvaluatedItem(index, options)) {
        return empty;
      } else if (unevaluatedItems === false) {
        return error('unevaluatedItems', options.name, index);
      } else {
        return evaluateItem(index, onlyErrors(validateSchema(unevaluatedItems, item, childOptions(index, options))));
      }
    }, value);
  }
  return empty;
};
