import { isObject } from '../helpers';
import {
  Validator,
  Options,
  Validation,
  evaluateProperty,
  validateSchema,
  onlyErrors,
  reduce,
  empty,
  combine,
  childOptions,
  error,
} from '../validation';
import { Schema } from '../schema';

const validateProperty = (schema: Schema, key: string, value: unknown, options: Options): Validation =>
  evaluateProperty(key, onlyErrors(validateSchema(schema, value, childOptions(key, options))));

export const validateProperties: Validator = (
  { properties, patternProperties, additionalProperties },
  value,
  options,
) => {
  if (
    (properties !== undefined || patternProperties !== undefined || additionalProperties !== undefined) &&
    isObject(value)
  ) {
    return reduce((key) => {
      const propertyValue = value[key];
      const propertySchema = properties?.[key];
      const patternPropertySchemas = patternProperties
        ? Object.entries(patternProperties)
            .filter(([pattern]) => RegExp(pattern).test(key))
            .map(([, patternSchema]) => patternSchema)
        : undefined;
      const results: Validation[] = [];

      if (propertySchema !== undefined) {
        results.push(validateProperty(propertySchema, key, propertyValue, options));
      }

      if (patternPropertySchemas?.length) {
        for (const patternSchema of patternPropertySchemas) {
          results.push(validateProperty(patternSchema, key, propertyValue, options));
        }
      }

      if (propertySchema === undefined && !patternPropertySchemas?.length && additionalProperties !== undefined) {
        results.push(
          additionalProperties === false
            ? error('additionalProperties', options.name, [key])
            : additionalProperties === true
              ? evaluateProperty(key, empty)
              : validateProperty(additionalProperties, key, propertyValue, options),
        );
      }

      return combine(results);
    }, Object.keys(value));
  }
  return empty;
};
