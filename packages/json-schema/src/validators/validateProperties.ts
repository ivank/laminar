import { childOptions, flatten, isObject, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateProperties: Validator = (schema, value, options) => {
  if (schema.properties && isObject(value)) {
    const { properties } = schema;
    return flatten(
      Object.keys(value).map((key) =>
        validateSchema(properties[key], value[key], childOptions(key, options)),
      ),
    );
  }
  return NoErrors;
};
