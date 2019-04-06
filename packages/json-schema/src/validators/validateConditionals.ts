import { isJsonSchema, NoErrors, validateSchema } from '../helpers';
import { Validator } from '../types';

export const validateConditionals: Validator = (schema, value, options) => {
  if (
    isJsonSchema(schema) &&
    schema.if !== undefined &&
    (schema.then !== undefined || schema.else !== undefined)
  ) {
    if (validateSchema(schema.if, value, options).errors.length === 0) {
      return schema.then ? validateSchema(schema.then, value, options) : NoErrors;
    } else {
      return schema.else ? validateSchema(schema.else, value, options) : NoErrors;
    }
  }
  return NoErrors;
};
