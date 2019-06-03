import { HasError, isJsonSchema, NoErrors, validateSchema } from '../helpers';
import { Schema, ValidateOptions, Validator } from '../types';

const findSchema = (schemas: Schema[], name: string, value: any, options: ValidateOptions) =>
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
    } else if (discriminator && value && value[discriminator.propertyName]) {
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

    const validations = oneOf.map(item => validateSchema(item, value, options));
    const matching = validations.filter(item => item.length === 0);

    if (matching.length !== 1) {
      return HasError('oneOf', options.name, { matching: matching.length, errors: validations });
    }
  }
  return NoErrors;
};
