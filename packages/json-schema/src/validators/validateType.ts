import { HasError, NoErrors } from '../helpers';
import { Validator } from '../types';

const getType = (value: any) =>
  value === null
    ? 'null'
    : Array.isArray(value)
    ? 'array'
    : Number.isInteger(value)
    ? 'integer'
    : typeof value;

export const validateType: Validator = (schema, value, { name }) => {
  if (schema.type) {
    const valueType = getType(value);
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (allowed.includes('number') && !allowed.includes('integer')) {
      allowed.push('integer');
    }

    if (!allowed.includes(valueType as any)) {
      return HasError('type', name, allowed);
    }
  }
  return NoErrors;
};
