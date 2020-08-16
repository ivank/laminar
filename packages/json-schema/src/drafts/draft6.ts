import { validateRefOnly } from '../validators/validateRefOnly';
import { validateProperties } from '../validators/validateProperties';
import { validateRequired } from '../validators/validateRequired';
import { validateItems } from '../validators/validateItems';
import { validateConst } from '../validators/validateConst';
import { validateEnum } from '../validators/validateEnum';
import { validateType } from '../validators/validateType';
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
import { validateDependencies } from '../validators/validateDependencies';
import { validateMinItems } from '../validators/validateMinItems';
import { validateMaxItems } from '../validators/validateMaxItems';
import { validateUniqueItems } from '../validators/validateUniqueItems';
import { validateContains } from '../validators/validateContains';
import { validateConditionals } from '../validators/validateConditionals';
import { validateNot } from '../validators/validateNot';
import { validateOneOf } from '../validators/validateOneOf';
import { validateAllOf } from '../validators/validateAllOf';
import { validateAnyOf } from '../validators/validateAnyOf';

export const draft6 = [
  validateRefOnly,
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
  validatePropertyNames,
  validateDependencies,
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
