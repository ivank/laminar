import { HasError, isEqual, isUniqueWith, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateUniqueItems: Validator = (schema, value, { name }) => {
  if (schema.uniqueItems && Array.isArray(value)) {
    const duplicateKeys = value.length - isUniqueWith(isEqual, value).length;
    if (duplicateKeys > 0) {
      return HasError('uniqueItems', name, duplicateKeys);
    }
  }
  return NoErrors;
};
