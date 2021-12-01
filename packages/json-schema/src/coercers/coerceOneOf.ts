import { Coercer, CoercerOptions, coerceSchema } from '../coercion';
import { isJsonSchema, isObject } from '../helpers';
import { Schema } from '../schema';
import { hasErrors, validateSchema } from '../validation';

const findSchema = (schemas: Schema[], name: string, value: unknown, options: CoercerOptions): Schema | undefined =>
  schemas.find((item) => {
    const itemSchema = isJsonSchema(item) && '$ref' in item && item.$ref ? options.refs[item.$ref] : item;
    return (
      itemSchema &&
      isJsonSchema(itemSchema) &&
      !!itemSchema.properties &&
      !hasErrors(
        validateSchema(itemSchema.properties[name], coerceSchema(itemSchema.properties[name], value, options), options),
      )
    );
  });

export const coerceOneOf: Coercer = (schema, value, options) => {
  if (schema.oneOf && schema.oneOf.length > 0) {
    const { oneOf, discriminator } = schema;
    if (oneOf.length === 1) {
      return coerceSchema(oneOf[0], value, options);
    } else if (discriminator && discriminator.propertyName && isObject(value) && value[discriminator.propertyName]) {
      const discriminatedSchema = findSchema(
        oneOf,
        discriminator.propertyName,
        value[discriminator.propertyName],
        options,
      );
      if (discriminatedSchema) {
        return coerceSchema(discriminatedSchema, value, options);
      }
    }

    const validSchemas = oneOf.filter(
      (item) => !hasErrors(validateSchema(item, coerceSchema(item, value, options), options)),
    );

    return validSchemas.length === 1 ? coerceSchema(validSchemas[0], value, options) : value;
  }
  return value;
};
