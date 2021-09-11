import { Coercer, coerceSchema } from '../coercion';

export const coerceItems: Coercer = (schema, value, options) => {
  if (schema.items !== undefined && Array.isArray(value)) {
    const { items, additionalItems } = schema;
    return value.map((item, index) => {
      const itemSchema = Array.isArray(items) ? (items[index] === undefined ? additionalItems : items[index]) : items;
      return itemSchema !== undefined ? coerceSchema(itemSchema, item, options) : item;
    });
  }
  return value;
};
