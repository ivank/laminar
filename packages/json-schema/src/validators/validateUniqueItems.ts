import { isEqual, isUniqueWith } from '../helpers';
import { Validator, empty, error } from '../validation';

export const validateUniqueItems: Validator = (schema, value, { name }) => {
  if (schema.uniqueItems && Array.isArray(value)) {
    const duplicateKeys = value.length - isUniqueWith(isEqual, value).length;
    if (duplicateKeys > 0) {
      return error('uniqueItems', name, duplicateKeys);
    }
  }
  return empty;
};
