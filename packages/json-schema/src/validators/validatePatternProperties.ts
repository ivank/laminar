import { childOptions, flatten, isObject, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validatePatternProperties: Validator = (schema, value, options) => {
  if (schema.patternProperties && isObject(value)) {
    return flatten(
      Object.entries(schema.patternProperties).map(([pattern, patternSchema]) =>
        flatten(
          Object.keys(value)
            .filter((key) => RegExp(pattern).test(key))
            .map((key) => validateSchema(patternSchema, value[key], childOptions(key, options))),
        ),
      ),
    );
  }
  return NoErrors;
};
