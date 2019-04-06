import { childOptions, CombineResults, isJsonSchema, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';
import { validateMinItems } from './validateMinItems';

export const validateContains: Validator = (schema, value, options) => {
  if (isJsonSchema(schema) && schema.contains !== undefined && Array.isArray(value)) {
    const { contains } = schema;
    const result = validateMinItems({ minItems: 1 }, value, options);
    const allItemsResults = value.map((item, index) =>
      validateSchema(contains, item, childOptions(index, options)),
    );
    if (allItemsResults.every(item => item.errors.length > 0)) {
      return CombineResults([result, ...allItemsResults]);
    }
    return result;
  }
  return NoErrors;
};
