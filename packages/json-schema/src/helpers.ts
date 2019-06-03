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

export const flatten = <T>(arr: T[][]): T[] => {
  const result: T[] = [];
  for (const item of arr) {
    for (const inner of item) {
      result.push(inner);
    }
  }
  return result;
};

export const isUniqueWith = <T = any>(compare: (a: T, b: T) => boolean, array: T[]) => {
  const items: T[] = [];
  for (const item of array) {
    if (!items.some(prev => compare(prev, item))) {
      items.push(item);
    }
  }
  return items;
};

export const NoErrors = { errors: [] };
export const HasError = (code: keyof Messages, name: string, param?: any) => ({
  errors: [{ code, name, param }],
});
export const HasErrors = (errors: Invalid[]) => ({ errors });
export const CombineResults = (results: Result[]) =>
  HasErrors(flatten(results.map(result => result.errors)));

export const validateSchema: Validator<Schema> = (schema, value, options) => {
  if (schema === true) {
    return { errors: [], valid: true };
  } else if (schema === false) {
    return { errors: [{ code: 'false', name: options.name, param: false }], valid: false };
  } else if (schema) {
    return CombineResults(options.validators.map(validator => validator(schema, value, options)));
  } else {
    return NoErrors;
  }
};
