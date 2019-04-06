import { resolveRefs } from '@ovotech/json-refs';
import { validateSchema } from './helpers';
import { messages } from './messages';
import { Schema, ValidateOptions } from './types';
import { validateAdditionalProperties } from './validators/validateAdditionalProperties';
import { validateAllOf } from './validators/validateAllOf';
import { validateAnyOf } from './validators/validateAnyOf';
import { validateBoolean } from './validators/validateBoolean';
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
  HasErrors,
  CombineResults,
  validateSchema,
} from './helpers';

export { Schema, JsonSchema, ValidateOptions, Validator, Messages } from './types';

export const draft7 = [
  validateBoolean,
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
  validateRequired,
  validateProperties,
  validatePatternProperties,
  validatePropertyNames,
  validateDependencies,
  validateAdditionalProperties,
  validateMinItems,
  validateMaxItems,
  validateUniqueItems,
  validateItems,
  validateContains,
  validateConditionals,
  validateNot,
  validateOneOf,
  validateAllOf,
  validateAnyOf,
];

export const validate = async (
  original: Schema,
  value: any,
  { name = 'value', validators = draft7 }: Partial<ValidateOptions> = {},
) => {
  const schema = await resolveRefs(original);
  const result = validateSchema(schema, value, { name, validators });
  const errors = result.errors.map(error => messages[error.code](error));

  return { schema, errors, valid: errors.length === 0 };
};
