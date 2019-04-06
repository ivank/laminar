import { HasError, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

const getPrecision = (num: number) => {
  if (!Number.isFinite(num)) {
    return 0;
  } else {
    let e = 1;
    let p = 0;
    while (Math.round(num * e) / e !== num) {
      e *= 10;
      p++;
    }
    return Math.round(p);
  }
};

const isDivisible = (num: number, divisor: number) => {
  const multiplier = Math.pow(10, Math.max(getPrecision(num), getPrecision(divisor)));
  return Math.round(num * multiplier) % Math.round(divisor * multiplier) === 0;
};

export const validateMultipleOf: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) &&
  schema.multipleOf &&
  typeof value === 'number' &&
  !isDivisible(value, schema.multipleOf)
    ? HasError('multipleOf', name, schema.multipleOf)
    : NoErrors;
