import { resolveRefs, resolveRefsFile } from '@ovotech/json-refs';
import { validateSchema } from './helpers';
import { messages } from './messages';
import { ValidateOptions, ValidationResult, ResolvedSchema, Schema } from './types';
import { validateAdditionalProperties } from './validators/validateAdditionalProperties';
import { validateAllOf } from './validators/validateAllOf';
import { validateAnyOf } from './validators/validateAnyOf';
import { validateConditionals } from './validators/validateConditionals';
import { validateConst } from './validators/validateConst';
import { validateContains } from './validators/validateContains';
import { validateDependencies } from './validators/validateDependencies';
import { validateEnum } from './validators/validateEnum';
import { validateExclusiveMaximum } from './validators/validateExclusiveMaximum';
import { validateExclusiveMinimum } from './validators/validateExclusiveMinimum';
import { validateFormat } from './validators/validateFormat';
import { validateItems } from './validators/validateItems';
import { validateMaximum } from './validators/validateMaximum';
import { validateMaxItems } from './validators/validateMaxItems';
import { validateMaxLength } from './validators/validateMaxLength';
import { validateMaxProperties } from './validators/validateMaxProperties';
import { validateMinimum } from './validators/validateMinimum';
import { validateMinItems } from './validators/validateMinItems';
import { validateMinLength } from './validators/validateMinLength';
import { validateMinProperties } from './validators/validateMinProperties';
import { validateMultipleOf } from './validators/validateMultipleOf';
import { validateNot } from './validators/validateNot';
import { validateOneOf } from './validators/validateOneOf';
import { validatePattern } from './validators/validatePattern';
import { validatePatternProperties } from './validators/validatePatternProperties';
import { validateProperties } from './validators/validateProperties';
import { validatePropertyNames } from './validators/validatePropertyNames';
import { validateRef } from './validators/validateRefs';
import { validateRequired } from './validators/validateRequired';
import { validateType } from './validators/validateType';
import { validateUniqueItems } from './validators/validateUniqueItems';
import { ValidationError } from './ValidationError';

export {
  childOptions,
  isJsonSchema,
  isObject,
  isEqual,
  isUniqueWith,
  NoErrors,
  HasError,
  validateSchema,
} from './helpers';

export { ValidateOptions, Validator, Messages, ResolvedSchema, Schema } from './types';

export const draft7 = [
  validateRef,
  validateProperties,
  validateRequired,
  validateItems,
  validateConst,
  validateEnum,
  validateType,
  validateFormat,
  validateMultipleOf,
  validateMinimum,
  validateExclusiveMinimum,
  validateMaximum,
  validateExclusiveMaximum,
  validatePattern,
  validateMinLength,
  validateMaxLength,
  validateMinProperties,
  validateMaxProperties,
  validatePatternProperties,
  validatePropertyNames,
  validateDependencies,
  validateAdditionalProperties,
  validateMinItems,
  validateMaxItems,
  validateUniqueItems,
  validateContains,
  validateConditionals,
  validateNot,
  validateOneOf,
  validateAllOf,
  validateAnyOf,
];

const defaultOptions = { name: 'value', validators: draft7, refs: {} };

export const compile = async (schema: Schema | string): Promise<ResolvedSchema> =>
  typeof schema === 'string' ? resolveRefsFile(schema) : resolveRefs(schema);

export const isCompiled = (schema: Schema | ResolvedSchema | string): schema is ResolvedSchema =>
  typeof schema === 'object' && 'schema' in schema && 'refs' in schema && 'uris' in schema;

export const validateCompiled = (
  schema: ResolvedSchema,
  value: unknown,
  options: Partial<ValidateOptions> = {},
): ValidationResult => {
  const result = validateSchema(schema.schema, value, {
    ...defaultOptions,
    refs: schema.refs,
    ...options,
  });
  const errors = result.map(error => messages[error.code](error));
  return { schema, errors, valid: errors.length === 0 };
};

export const validate = async (
  schema: Schema | ResolvedSchema | string,
  value: unknown,
  options: Partial<ValidateOptions> = {},
): Promise<ValidationResult> => {
  return validateCompiled(isCompiled(schema) ? schema : await compile(schema), value, options);
};

export const ensureValid = async <T>(
  schema: Schema | ResolvedSchema | string,
  value: unknown,
  options: Partial<ValidateOptions> = {},
): Promise<T> => {
  const result = await validate(schema, value, options);
  const name = options.name || 'Value';

  if (!result.valid) {
    throw new ValidationError(`Invalid ${name}`, result.errors);
  }

  return value as T;
};
