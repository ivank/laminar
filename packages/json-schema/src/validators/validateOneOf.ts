import {
  childOptions,
  flatten,
  HasError,
  isJsonSchema,
  NoErrors,
  validateSchema,
  isObject,
} from '../helpers';
import { ValidateOptions, Validator, Schema } from '../types';

const findSchema = (
  schemas: Schema[],
  name: string,
  value: unknown,
  options: ValidateOptions,
): Schema | undefined =>
  schemas.find(
    item =>
      isJsonSchema(item) &&
      'type' in item &&
      item.type === 'object' &&
      !!item.properties &&
      validateSchema(item.properties[name], value, options).length === 0,
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
    const matching = validations.filter(item => item.length === 0);

    if (matching.length !== 1) {
      return [...HasError('oneOf', options.name, matching.length), ...flatten(validations)];
    }
  }
  return NoErrors;
};
