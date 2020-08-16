import { Validator, error, empty } from '../validation';

const getType = (
  value: unknown,
): 'null' | 'boolean' | 'object' | 'array' | 'number' | 'string' | 'integer' | undefined => {
  if (value === null) {
    return 'null';
  } else if (Array.isArray(value)) {
    return 'array';
  } else if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  } else if (typeof value === 'object') {
    return 'object';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'string') {
    return 'string';
  } else {
    return undefined;
  }
};

export const validateType: Validator = ({ type }, value, { name }) => {
  if (type) {
    const valueType = getType(value);
    const allowed = Array.isArray(type) ? type : [type];
    if (allowed.includes('number') && !allowed.includes('integer')) {
      allowed.push('integer');
    }

    if (!valueType || !allowed.includes(valueType)) {
      return error('type', name, allowed);
    }
  }
  return empty;
};
