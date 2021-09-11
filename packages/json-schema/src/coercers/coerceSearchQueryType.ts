import { Coercer } from '../coercion';

const trueString = ['true', 'yes', '1'];
const falseString = ['false', 'no', '0'];

export const coerceSearchQueryType: Coercer = ({ type }, value) => {
  if (!Array.isArray(type)) {
    switch (type) {
      case 'integer':
        const intValue = Number(value);
        return Number.isInteger(intValue) ? intValue : value;
      case 'number':
        const floatValue = Number(value);
        return Number.isNaN(floatValue) ? value : floatValue;
      case 'boolean':
        return typeof value === 'string'
          ? trueString.includes(value)
            ? true
            : falseString.includes(value)
            ? false
            : value
          : value;
      case 'null':
        return value === 'null' ? null : value;
    }
  }
  return value;
};
