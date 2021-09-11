import { Coercer, coerceSchema } from '../coercion';
import { hasErrors, validateSchema } from '../validation';

export const coerceAnyOf: Coercer = (schema, value, options) => {
  if (schema.anyOf && schema.anyOf.length > 0) {
    if (schema.anyOf.length === 1) {
      return coerceSchema(schema.anyOf[0], value, options);
    } else {
      const noErrorSchema = schema.anyOf.find(
        (item) => !hasErrors(validateSchema(item, coerceSchema(item, value, options), options)),
      );
      return noErrorSchema ? coerceSchema(noErrorSchema, value, options) : value;
    }
  }
  return value;
};
