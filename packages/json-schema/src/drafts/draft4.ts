import { validateRefOnly } from '../validators/validateRefOnly';
import { validateProperties } from '../validators/validateProperties';
import { validateRequired } from '../validators/validateRequired';
import { validateItems } from '../validators/validateItems';
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
import { validateDependencies } from '../validators/validateDependencies';
import { validateMinItems } from '../validators/validateMinItems';
import { validateMaxItems } from '../validators/validateMaxItems';
import { validateUniqueItems } from '../validators/validateUniqueItems';
import { validateNot } from '../validators/validateNot';
import { validateOneOf } from '../validators/validateOneOf';
import { validateAllOf } from '../validators/validateAllOf';
import { validateAnyOf } from '../validators/validateAnyOf';

export const draft4 = [
  validateRefOnly,
  validatePattern,
  validateMultipleOf,
  validateMinimum,
  validateExclusiveMinimum,
  validateMaximum,
  validateExclusiveMaximum,
  validatePattern,
  validateMinLength,
  validateMaxLength,
  validateItems,
  validateMinItems,
  validateMaxItems,
  validateUniqueItems,
  validateDependencies,
  validateProperties,
  validateMinProperties,
  validateMaxProperties,
  validateRequired,
  validateEnum,
  validateNot,
  validateOneOf,
  validateAllOf,
  validateAnyOf,
  validateFormat,
  validateType,
];
