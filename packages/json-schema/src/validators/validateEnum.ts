import { HasError, isEqual, isJsonSchema, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateEnum: Validator = (schema, value, { name }) =>
  isJsonSchema(schema) && schema.enum && !schema.enum.some(item => isEqual(item, value))
    ? HasError('enum', name, schema.enum)
    : NoErrors;
