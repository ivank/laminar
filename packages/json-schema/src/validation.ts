import { Schema, JsonSchema } from './schema';
import { RefMap } from './resolve';

export type InvalidCode =
  | 'not'
  | 'enum'
  | 'type'
  | 'multipleOf'
  | 'minimum'
  | 'exclusiveMinimum'
  | 'maximum'
  | 'exclusiveMaximum'
  | 'pattern'
  | 'format'
  | 'false'
  | 'maxLength'
  | 'minLength'
  | 'contains'
  | 'additionalProperties'
  | 'unevaluatedProperties'
  | 'unevaluatedItems'
  | 'required'
  | 'minProperties'
  | 'maxProperties'
  | 'dependencies'
  | 'uniqueItems'
  | 'minItems'
  | 'maxItems'
  | 'oneOf'
  | 'anyOf';

export interface Invalid<TParam = unknown> {
  code: InvalidCode;
  name: string;
  param: TParam;
}

export type Messages = Record<InvalidCode, (error: Invalid) => string>;

export interface Options {
  name: string;
  validators: Validator[];
  refs: RefMap;
  evaluatedItems?: number[];
  evaluatedProperties?: string[];
}

export type Validator<TSchema = JsonSchema, TValue = unknown> = (
  schema: TSchema,
  value: TValue,
  options: Options,
) => Validation;

export interface Validation {
  errors: Invalid[];
  skipRest?: boolean;
  evaluatedProperties?: string[];
  evaluatedItems?: number[];
}

const mergeArrays = <T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined =>
  b && b.length ? a?.concat(b.filter((item) => !a?.includes(item))) ?? b : a;

// Setters and Getters
// ===========================

export const error = (code: keyof Messages, name: string, param?: unknown): Validation => ({
  errors: [{ code, name, param }],
});

export const empty: Validation = { errors: [] };

export const onlyErrors = ({ errors }: Validation): Validation => ({ errors });

export const errors = ({ errors }: Validation): Invalid[] => errors;

export const evaluateItem = (item: number, validation: Validation): Validation => ({
  ...validation,
  evaluatedItems: mergeArrays(validation.evaluatedItems, [item]),
});

export const evaluateProperty = (property: string, validation: Validation): Validation => ({
  ...validation,
  evaluatedProperties: mergeArrays(validation.evaluatedProperties, [property]),
});

export const skipRest = (validation: Validation): Validation => ({ ...validation, skipRest: true });

export const hasErrors = ({ errors }: Validation): boolean => errors.length > 0;

export const hasEvaluatedItem = (item: number, { evaluatedItems }: Validation | Options): boolean =>
  Boolean(evaluatedItems?.includes(item));

export const hasEvaluatedProperty = (
  property: string,
  { evaluatedProperties }: Validation | Options,
): boolean => Boolean(evaluatedProperties?.includes(property));

// Combinators
// ===========================

export const combine = (validations: Validation[]): Validation =>
  validations.reduce(
    (acc, item) => ({
      errors: acc.errors.concat(item.errors),
      skipRest: item.skipRest,
      evaluatedProperties: mergeArrays(acc.evaluatedProperties, item.evaluatedProperties),
      evaluatedItems: mergeArrays(acc.evaluatedItems, item.evaluatedItems),
    }),
    empty,
  );

export const combineErrors = (validations: Validation[]): Validation =>
  validations.reduce((acc, item) => ({ errors: acc.errors.concat(item.errors) }), empty);
export const reduce = <T>(
  callbackfn: (item: T, index: number, current: Validation) => Validation,
  items: T[],
  inital: Validation = empty,
): Validation =>
  items.reduce(
    (acc, item, index) => (acc.skipRest ? acc : combine([acc, callbackfn(item, index, acc)])),
    inital,
  );

export const childOptions = (name: string | number, options: Options): Options => ({
  ...options,
  name: `${options.name}.${name}`,
});

export const validateSchema: Validator<Schema> = (schema, value, options) =>
  schema === true
    ? empty
    : schema === false
    ? error('false', options.name, false)
    : schema
    ? reduce(
        (validator, index, current) => validator(schema, value, { ...options, ...current }),
        options.validators,
      )
    : empty;
