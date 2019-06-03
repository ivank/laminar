import { resolveRefs } from '@ovotech/json-refs';
import { validateSchema } from './helpers';
import { messages } from './messages';
import { CompiledSchema, Schema, ValidateOptions } from './types';
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

export { Schema, JsonSchema, ValidateOptions, Validator, Messages, PrimitiveType } from './types';

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

export const compile = async <TSchema = Schema>(schema: Schema): Promise<CompiledSchema<TSchema>> =>
  resolveRefs(schema);

export const isCompiled = (schema: any): schema is CompiledSchema =>
  typeof schema === 'object' && 'schema' in schema && 'refs' in schema;

export const validate = async (
  schema: Schema | CompiledSchema,
  value: any,
  options: Partial<ValidateOptions> = {},
) => {
  return validateCompiled(isCompiled(schema) ? schema : await compile(schema), value, options);
};

export const validateCompiled = (
  schema: CompiledSchema,
  value: any,
  options: Partial<ValidateOptions> = {},
) => {
  const result = validateSchema(schema.schema, value, {
    ...defaultOptions,
    refs: schema.refs,
    ...options,
  });
  const errors = result.map(error => messages[error.code](error));
  return { schema, errors, valid: errors.length === 0 };
};
