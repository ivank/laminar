import { isJsonSchema, isObject } from '../../helpers';
import { Schema } from '../../schema';
import { Validator, hasErrors, error, empty, validateSchema, Options, errors } from '../../validation';

const findSchema = (schemas: Schema[], name: string, value: unknown, options: Options): Schema | undefined =>
  schemas.find((item) => {
    const itemSchema = isJsonSchema(item) && '$ref' in item && item.$ref ? options.refs[item.$ref] : item;
    return (
      itemSchema &&
      isJsonSchema(itemSchema) &&
      !!itemSchema.properties &&
      !hasErrors(validateSchema(itemSchema.properties[name], value, options))
    );
  });

export const validateOneOf: Validator = (schema, value, options) => {
  if (schema.oneOf && schema.oneOf.length > 0) {
    const { oneOf, discriminator } = schema;
    if (oneOf.length === 1) {
      return validateSchema(oneOf[0], value, options);
    } else if (discriminator && discriminator.propertyName && isObject(value) && value[discriminator.propertyName]) {
      const discriminatedSchema = findSchema(
        oneOf,
        discriminator.propertyName,
        value[discriminator.propertyName],
        options,
      );
      if (discriminatedSchema) {
        return validateSchema(discriminatedSchema, value, options);
      }
    }

    const validations = oneOf.map((item) => validateSchema(item, value, options));
    const matching = validations.filter((item) => !hasErrors(item));

    return matching.length === 1 ? matching[0] : error('oneOf', options.name, validations.map(errors));
  }
  return empty;
};
