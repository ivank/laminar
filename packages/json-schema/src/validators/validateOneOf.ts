import { isJsonSchema, isObject } from '../helpers';
import { Schema } from '../schema';
import {
  Validator,
  hasErrors,
  error,
  empty,
  childOptions,
  validateSchema,
  combine,
  Options,
} from '../validation';

const findSchema = (
  schemas: Schema[],
  name: string,
  value: unknown,
  options: Options,
): Schema | undefined =>
  schemas.find(
    (item) =>
      isJsonSchema(item) &&
      'type' in item &&
      item.type === 'object' &&
      !!item.properties &&
      !hasErrors(validateSchema(item.properties[name], value, options)),
  );

export const validateOneOf: Validator = (schema, value, options) => {
  if (schema.oneOf && schema.oneOf.length > 0) {
    const { oneOf, discriminator } = schema;
    if (oneOf.length === 1) {
      return validateSchema(oneOf[0], value, options);
    } else if (
      discriminator &&
      discriminator.propertyName &&
      isObject(value) &&
      value[discriminator.propertyName]
    ) {
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

    const validations = oneOf.map((item, index) =>
      validateSchema(item, value, childOptions(`${index}?`, options)),
    );
    const matching = validations.filter((item) => !hasErrors(item));

    if (matching.length !== 1) {
      return combine([error('oneOf', options.name, matching.length), ...validations]);
    } else {
      return combine(matching);
    }
  }
  return empty;
};
