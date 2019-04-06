import {
  childOptions,
  CombineResults,
  isJsonSchema,
  isObject,
  NoErrors,
  validateSchema,
} from '../helpers';
import { Validator } from '../types';

export const validatePatternProperties: Validator = (schema, value, options) => {
  if (isJsonSchema(schema) && schema.patternProperties && isObject(value)) {
    return CombineResults(
      Object.entries(schema.patternProperties).map(([pattern, patternSchema]) =>
        CombineResults(
          Object.keys(value)
            .filter(key => RegExp(pattern).test(key))
            .map(key => validateSchema(patternSchema, value[key], childOptions(key, options))),
        ),
      ),
    );
  }
  return NoErrors;
};
