import { Validator, error, empty } from '../../validation';
import { getType } from '../validateType';

export const validateType: Validator = ({ type, nullable }, value, { name }) => {
  if (type) {
    const valueType = getType(value);
    const allowed = Array.isArray(type) ? type : [type];

    if (nullable) {
      allowed.push('null');
    }

    if (allowed.includes('number') && !allowed.includes('integer')) {
      allowed.push('integer');
    }

    if (!valueType || !allowed.includes(valueType)) {
      return error('type', name, allowed);
    }
  }
  return empty;
};
