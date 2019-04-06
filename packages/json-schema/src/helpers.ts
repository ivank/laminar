import { Invalid, JsonSchema, Messages, Result, Schema, ValidateOptions, Validator } from './types';

export const childOptions = (name: string | number, options: ValidateOptions) => ({
  ...options,
  name: `${options.name}.${name}`,
});

export const isJsonSchema = (schema: Schema): schema is JsonSchema =>
  schema && typeof schema === 'object';

export const isObject = (value: any): value is { [key: string]: any } =>
  value && typeof value === 'object' && !Array.isArray(value);

export const isEqual = (a: any, b: any): boolean => {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined || a === null || b === null) {
    return false;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    } else if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((item, index) => isEqual(item, b[index]));
    } else if (!Array.isArray(a) && !Array.isArray(b)) {
      const aKeys = Object.keys(a).sort();
      const bKeys = Object.keys(a).sort();
      return isEqual(aKeys, bKeys) && aKeys.every(key => isEqual(a[key], b[key]));
    }
  }
  return false;
};

export const isUniqueWith = (compare: (a: any, b: any) => boolean, array: any[]) =>
  array.reduce<any[]>(
    (all, item) => (all.some(prev => compare(prev, item)) ? all : [...all, item]),
    [],
  );

export const NoErrors = { errors: [] };
export const HasError = (code: keyof Messages, name: string, param?: any) => ({
  errors: [{ code, name, param }],
});
export const HasErrors = (errors: Invalid[]) => ({ errors });
export const CombineResults = (results: Result[]) =>
  HasErrors(results.reduce<Invalid[]>((errors, item) => [...errors, ...item.errors], []));

export const validateSchema: Validator = (schema, value, options) =>
  options.validators.reduce<Result>((current, validator) => {
    if (current.valid === true || current.valid === false) {
      return current;
    }
    const { errors, valid } = validator(schema, value, options);
    return { errors: [...errors, ...current.errors], valid };
  }, NoErrors);
