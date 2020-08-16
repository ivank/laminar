import { Validator, error, empty } from '../validation';
import { isEqual } from '../helpers';

export const validateEnum: Validator = (schema, value, { name }) =>
  schema.enum && !schema.enum.some((item) => isEqual(item, value))
    ? error('enum', name, schema.enum)
    : empty;
