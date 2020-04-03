import { HasError, isEqual, NoErrors } from '../helpers';
import { Validator } from '../types';

export const validateEnum: Validator = (schema, value, { name }) =>
  schema.enum && !schema.enum.some((item) => isEqual(item, value))
    ? HasError('enum', name, schema.enum)
    : NoErrors;
