import { Coercer } from '../coercion';

export const coerceType: Coercer = ({ type, format }, value) => {
  if (type === 'string' && typeof value === 'string' && (format === 'date-time' || format === 'date')) {
    return new Date(value);
  }
  return value;
};
