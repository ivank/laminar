import { validateRef } from '../validators/validateRef';
import { validateProperties } from '../validators/validateProperties';
import { validateRequired } from '../validators/validateRequired';
import { validateEnum } from '../validators/validateEnum';
import { validateFormat } from '../validators/validateFormat';
import { validateMultipleOf } from '../validators/validateMultipleOf';
import { validateMinimum } from '../validators/validateMinimum';
import { validateExclusiveMinimum } from '../validators/validateExclusiveMinimum';
import { validateMaximum } from '../validators/validateMaximum';
import { validateExclusiveMaximum } from '../validators/validateExclusiveMaximum';
import { validatePattern } from '../validators/validatePattern';
import { validateMinLength } from '../validators/validateMinLength';
import { validateMaxLength } from '../validators/validateMaxLength';
import { validateMinProperties } from '../validators/validateMinProperties';
import { validateMaxProperties } from '../validators/validateMaxProperties';
import { validatePropertyNames } from '../validators/validatePropertyNames';
import { validateMinItems } from '../validators/validateMinItems';
import { validateMaxItems } from '../validators/validateMaxItems';
import { validateUniqueItems } from '../validators/validateUniqueItems';
import { validateNot } from '../validators/validateNot';
import { validateAllOf } from '../validators/validateAllOf';
import { validateAnyOf } from '../validators/validateAnyOf';
import { validateType } from '../validators/openapi3/validateType';
import { validateOneOf } from '../validators/openapi3/validateOneOf';
import { validateItems } from '../validators/openapi3/validateItems';

export const openapi3 = [
  validateRef,
  validateProperties,
  validateRequired,
  validateItems,
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
  validatePropertyNames,
  validateMinItems,
  validateMaxItems,
  validateUniqueItems,
  validateNot,
  validateOneOf,
  validateAllOf,
  validateAnyOf,
];
