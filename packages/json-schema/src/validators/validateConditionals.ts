import { Validator, combine, hasErrors, empty, validateSchema } from '../validation';

export const validateConditionals: Validator = (schema, value, options) => {
  if (schema.if !== undefined && (schema.then !== undefined || schema.else !== undefined)) {
    const ifResponse = validateSchema(schema.if, value, options);
    if (!hasErrors(ifResponse)) {
      return schema.then
        ? combine([ifResponse, validateSchema(schema.then, value, options)])
        : ifResponse;
    } else {
      return schema.else ? validateSchema(schema.else, value, options) : empty;
    }
  }
  return empty;
};
