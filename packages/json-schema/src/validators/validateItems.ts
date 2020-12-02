import { Validator, childOptions, empty, validateSchema, reduce, onlyErrors, evaluateItem } from '../validation';

export const validateItems: Validator = (schema, value, options) => {
  if (schema.items !== undefined && Array.isArray(value)) {
    const { items, additionalItems } = schema;
    return reduce((item, index) => {
      const noSchema = {};
      const additional = additionalItems === undefined ? noSchema : additionalItems;
      const itemSchema = Array.isArray(items) ? (items[index] === undefined ? additional : items[index]) : items;
      const validation = onlyErrors(validateSchema(itemSchema, item, childOptions(index, options)));
      return itemSchema === noSchema ? validation : evaluateItem(index, validation);
    }, value);
  }
  return empty;
};
