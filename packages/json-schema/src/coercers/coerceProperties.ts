import { Coercer, coerceSchema } from '../coercion';
import { isEqual, isObject, isUniqueWith } from '../helpers';

export const coerceProperties: Coercer = ({ properties, patternProperties, additionalProperties }, value, options) => {
  if (properties && isObject(value) && !Array.isArray(value)) {
    const keys = isUniqueWith(isEqual, Object.keys(value).concat(Object.keys(properties)));

    return keys.reduce((all, key) => {
      const propertyValue = value[key];
      const matchingPatternPropertiesSchemas = patternProperties
        ? Object.entries(patternProperties)
            .filter(([pattern]) => RegExp(pattern).test(key))
            .map(([, schema]) => schema)
        : [];
      const coercedPropertyValue = properties[key]
        ? coerceSchema(properties[key], propertyValue, options)
        : matchingPatternPropertiesSchemas.length
        ? matchingPatternPropertiesSchemas.reduce(
            (current, patternSchema) => coerceSchema(patternSchema, current, options),
            propertyValue,
          )
        : additionalProperties
        ? coerceSchema(additionalProperties, propertyValue, options)
        : propertyValue;

      return coercedPropertyValue === undefined ? all : { ...all, [key]: coercedPropertyValue };
    }, value);
  }
  return value;
};
