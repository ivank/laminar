import { resolveRefs } from '@ovotech/json-refs';
import {
  difference,
  entries,
  filter,
  find,
  flatMap,
  flow,
  getOr,
  has,
  isArray,
  isEmpty,
  isEqual,
  isInteger,
  isPlainObject,
  keys,
  map,
  set,
  some,
  uniqWith,
} from 'lodash/fp';

export type PrimitiveType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';

export interface Schema {
  $ref?: string;
  $id?: string;
  id?: string;
  if?: Schema;
  then?: Schema;
  else?: Schema;
  type?: PrimitiveType | PrimitiveType[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  const?: any;
  format?:
    | 'date'
    | 'date-time'
    | 'password'
    | 'byte'
    | 'binary'
    | 'email'
    | 'uuid'
    | 'uri'
    | 'hostname'
    | 'ipv4'
    | 'ipv6'
    | 'binary'
    | 'byte'
    | string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;
  items?: Schema | Schema[];
  contains?: Schema;
  additionalItems?: boolean | Schema;
  uniqueItems?: boolean;
  minItems?: number;
  maxItems?: number;
  properties?: { [key: string]: Schema };
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  additionalProperties?: boolean | Schema;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: Schema;
  patternProperties?: { [key: string]: Schema };
  dependencies?: { [key: string]: string[] | Schema };
  title?: string;
  description?: string;
  nullable?: boolean;
  enum?: any[];
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
  discriminator?: Discriminator;
  [key: string]: any;
}

export interface Discriminator {
  propertyName: string;
}

export interface Invalid {
  code: keyof Messages;
  name: string;
  param?: any;
}

export interface ValidateOptions {
  name: string;
}

type Validator = (schema: Schema, value: any, options: ValidateOptions) => Invalid[];

export interface Messages {
  [key: string]: (error: Invalid) => string;
}

const messages: Messages = {
  not: ({ name }) => `"${name}" should not match`,
  enum: ({ name, param }) => `"${name}" should be one of [${param.join(', ')}]`,
  type: ({ name, param }) => `"${name}" should be a [${param}]`,
  multipleOf: ({ name, param }) => `"${name}" should be a multiple of ${param}`,
  minimum: ({ name, param }) => `"${name}" should be >= ${param}`,
  exclusiveMinimum: ({ name, param }) => `"${name}" should be > ${param}`,
  maximum: ({ name, param }) => `"${name}" should be <= ${param}`,
  exclusiveMaximum: ({ name, param }) => `"${name}" should be < ${param}`,
  pattern: ({ name, param }) => `"${name}" should match /${param}/`,
  typeFormat: ({ name, param }) => `"${name}" should match ${param} format`,
  maxLength: ({ name, param }) => `"${name}" should have length <= ${param}`,
  minLength: ({ name, param }) => `"${name}" should have length >= ${param}`,
  false: ({ name }) => `"${name}" should not exist`,
  additionalProperties: ({ name, param }) => `"${name}" has unknown keys [${param.join(', ')}]`,
  required: ({ name, param }) => `"${name}" is missing [${param.join(', ')}] keys`,
  minProperties: ({ name, param }) => `"${name}" should have >= ${param} keys`,
  maxProperties: ({ name, param }) => `"${name}" should have <= ${param} keys`,
  dependencies: ({ name, param }) => `"${name}" requires [${param.join(', ')}] keys`,
  uniqueItems: ({ name }) => `"${name}" should have only unique values`,
  minItems: ({ name, param }) => `"${name}" should have >= ${param} items`,
  maxItems: ({ name, param }) => `"${name}" should have <= ${param} items`,
  additionalItems: ({ name, param }) => `"${name}" has unknown indexes ${param}`,
  oneOf: ({ name, param }) => `"${name}" should match only 1 schema, matching ${param}`,
  anyOf: ({ name }) => `"${name}" should match at least 1 schema`,
};

const getPrecision = (num: number) => {
  if (!Number.isFinite(num)) {
    return 0;
  } else {
    let e = 1;
    let p = 0;
    while (Math.round(num * e) / e !== num) {
      e *= 10;
      p++;
    }
    return Math.round(p);
  }
};

const isDivisible = (num: number, divisor: number) => {
  const multiplier = Math.pow(10, Math.max(getPrecision(num), getPrecision(divisor)));
  return Math.round(num * multiplier) % Math.round(divisor * multiplier) === 0;
};

const flatMapIndex = (flatMap as any).convert({ cap: false });
const mapIndex = (map as any).convert({ cap: false });

const validateEnum: Validator = (schema, value, { name }) =>
  schema.enum && !some(isEqual(value), schema.enum)
    ? [{ name, code: 'enum', param: schema.enum }]
    : [];

const getType = (value: any) =>
  value === null ? 'null' : isArray(value) ? 'array' : isInteger(value) ? 'integer' : typeof value;

const formats: { [key: string]: RegExp } = {
  'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d:\d\d)$/i,
  time: /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d:\d\d)?$/i,
  date: /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
  email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  hostname: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*$/i,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  uri: /^(?:[a-z][a-z0-9+-.]*:)(?:\/?\/)?[^\s]*$/i,
  'uri-reference': /^(?:(?:[a-z][a-z0-9+-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
  url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
  uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
  'json-pointer': /^(?:\/(?:[^~/]|~0|~1)*)*$/,
  'relative-json-pointer': /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
};

const validateType: Validator = ({ type, format }, value, { name }) => {
  const errors: Invalid[] = [];

  if (type) {
    const valueType = getType(value);
    const allowed = isArray(type) ? type : [type];
    if (allowed.includes('number') && !allowed.includes('integer')) {
      allowed.push('integer');
    }

    if (!allowed.includes(valueType as any)) {
      errors.push({ name, code: 'type', param: allowed });
    }

    if (format && format in formats && !formats[format].test(value)) {
      errors.push({ name, code: 'typeFormat', param: format });
    }
  }

  return errors;
};

const validateMultipleOf: Validator = ({ multipleOf }, value, { name }) =>
  multipleOf && typeof value === 'number' && !isDivisible(value, multipleOf)
    ? [{ name, code: 'multipleOf', param: multipleOf }]
    : [];

const validateMinimum: Validator = ({ minimum, exclusiveMinimum }, value, options) => {
  if (minimum !== undefined) {
    if (exclusiveMinimum === true) {
      return validateExclusiveMinimum({ exclusiveMinimum: minimum }, value, options);
    } else if (value < minimum) {
      return [{ name: options.name, code: 'minimum', param: minimum }];
    }
  }

  return [];
};

const validateExclusiveMinimum: Validator = ({ exclusiveMinimum }, value, { name }) =>
  typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum
    ? [{ name, code: 'exclusiveMinimum', param: exclusiveMinimum }]
    : [];

const validateMaximum: Validator = ({ maximum, exclusiveMaximum }, value, options) => {
  if (maximum !== undefined) {
    if (exclusiveMaximum === true) {
      return validateExclusiveMaximum({ exclusiveMaximum: maximum }, value, options);
    } else if (value > maximum) {
      return [{ name: options.name, code: 'maximum', param: maximum }];
    }
  }
  return [];
};

const validateExclusiveMaximum: Validator = ({ exclusiveMaximum }, value, { name }) =>
  typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum!
    ? [{ name, code: 'exclusiveMaximum', param: exclusiveMaximum }]
    : [];

const validatePattern: Validator = ({ pattern }, value, { name }) =>
  pattern && typeof value === 'string' && !new RegExp(pattern).test(value)
    ? [{ name, code: 'pattern', param: pattern }]
    : [];

const validateMinLength: Validator = ({ minLength }, value, { name }) =>
  minLength && typeof value === 'string' && [...value].length < minLength
    ? [{ name, code: 'minLength', param: minLength }]
    : [];

const validateMaxLength: Validator = ({ maxLength }, value, { name }) =>
  maxLength && typeof value === 'string' && [...value].length > maxLength
    ? [{ name, code: 'maxLength', param: maxLength }]
    : [];

const validateMinProperties: Validator = ({ minProperties }, value, { name }) =>
  minProperties && isPlainObject(value) && keys(value).length < minProperties
    ? [{ name, code: 'minProperties', param: minProperties }]
    : [];

const validateMaxProperties: Validator = ({ maxProperties }, value, { name }) =>
  maxProperties && isPlainObject(value) && keys(value).length > maxProperties
    ? [{ name, code: 'maxProperties', param: maxProperties }]
    : [];

const validateRequired: Validator = ({ required }, value, { name }) => {
  if (required && required.length && isPlainObject(value)) {
    const missingKeys = difference(required, keys(value));
    if (missingKeys.length > 0) {
      return [{ name, code: 'required', param: missingKeys }];
    }
  }
  return [];
};

const childOptions = (name: string | number, options: ValidateOptions) =>
  set('name', `${options.name}.${name}`, options);

const validateProperties: Validator = ({ properties }, value, options) => {
  if (properties && isPlainObject(value)) {
    return flatMap(
      key => validateSchema(properties[key], value[key], childOptions(key, options)),
      keys(value),
    );
  }
  return [];
};

const validatePatternProperties: Validator = ({ patternProperties }, value, options) => {
  if (patternProperties && isPlainObject(value)) {
    return flatMap(([pattern, schema]) => {
      return flatMap(
        key => validateSchema(schema, value[key], childOptions(key, options)),
        keys(value).filter(key => RegExp(pattern).test(key)),
      );
    }, entries(patternProperties));
  }
  return [];
};

const validatePropertyNames: Validator = ({ propertyNames }, value, options) => {
  if (propertyNames !== undefined && isPlainObject(value)) {
    return flatMap(
      key => validateSchema(propertyNames, key, childOptions(key, options)),
      keys(value),
    );
  }
  return [];
};

const validateDependencies: Validator = ({ dependencies }, value, options) => {
  if (dependencies && isPlainObject(value)) {
    const activeDependencies = filter(([key]) => has(key, value), entries(dependencies));
    return flatMap(([key, dependency]) => {
      if (isArray(dependency)) {
        const missing = difference(dependency, keys(value));
        return missing.length > 0
          ? [{ name: `${options.name}.${key}`, code: 'dependencies', param: missing }]
          : [];
      } else {
        return validateSchema(dependency, value, childOptions(key, options));
      }
    }, activeDependencies);
  }
  return [];
};

const validateAdditionalProperties: Validator = (
  { additionalProperties, properties, patternProperties },
  value,
  options,
) => {
  if (additionalProperties !== undefined && additionalProperties !== true && isPlainObject(value)) {
    const additionalKeys = flow(
      filter((key: string) => !has(key, properties)),
      filter((key: string) => !some(pattern => RegExp(pattern).test(key), keys(patternProperties))),
    )(keys(value));

    if (additionalKeys.length > 0) {
      if (additionalProperties === false) {
        return [{ name: options.name, code: 'additionalProperties', param: additionalKeys }];
      } else if (isPlainObject(additionalProperties)) {
        return flatMap(
          key => validateSchema(additionalProperties, value[key], childOptions(key, options)),
          additionalKeys,
        );
      }
    }
  }

  return [];
};

const validateMinItems: Validator = ({ minItems }, value, { name }) =>
  minItems && isArray(value) && value.length < minItems
    ? [{ name, code: 'minItems', param: minItems }]
    : [];

const validateMaxItems: Validator = ({ maxItems }, value, { name }) =>
  maxItems && isArray(value) && value.length > maxItems
    ? [{ name, code: 'maxItems', param: maxItems }]
    : [];

const validateUniqueItems: Validator = ({ uniqueItems }, value, { name }) =>
  uniqueItems && isArray(value) && uniqWith(isEqual, value).length !== value.length
    ? [{ name, code: 'uniqueItems' }]
    : [];

const validateItems: Validator = ({ items, additionalItems }, value, options) => {
  if (items !== undefined && isArray(value)) {
    return flatMapIndex((item: any, index: number) => {
      const itemSchema = isArray(items)
        ? getOr(additionalItems === undefined ? {} : additionalItems, index, items)
        : items;
      return validateSchema(itemSchema, item, childOptions(index, options));
    }, value);
  }
  return [];
};

const validateContains: Validator = ({ contains }, value, options) => {
  if (contains !== undefined && isArray(value)) {
    let errors = validateMinItems({ minItems: 1 }, value, options);
    const allItemsErrors: Invalid[][] = mapIndex(
      (item: any, index: number) => validateSchema(contains, item, childOptions(index, options)),
      value,
    );
    if (allItemsErrors.every(itemErrors => itemErrors.length > 0)) {
      errors = errors.concat(...allItemsErrors);
    }
    return errors;
  }
  return [];
};

const validateConst: Validator = (schema, value, options) =>
  schema.const !== undefined ? validateEnum({ enum: [schema.const] }, value, options) : [];

const validateConditionals: Validator = (schema, value, options) => {
  if (schema.if !== undefined && (schema.then !== undefined || schema.else !== undefined)) {
    if (validateSchema(schema.if, value, options).length === 0) {
      return schema.then ? validateSchema(schema.then, value, options) : [];
    } else {
      return schema.else ? validateSchema(schema.else, value, options) : [];
    }
  }
  return [];
};

const validateNot: Validator = ({ not }, value, options) =>
  not && validateSchema(not, value, options).length === 0
    ? [{ name: options.name, code: 'not' }]
    : [];

const findSchema = (schemas: Schema[], name: string, value: any, options: ValidateOptions) =>
  find(
    item =>
      'type' in item &&
      item.type === 'object' &&
      !!item.properties &&
      validateSchema(item.properties[name], value, options).length === 0,
    schemas,
  );

const validateOneOf: Validator = ({ oneOf, discriminator }, value, options) => {
  if (oneOf && oneOf.length > 0) {
    if (oneOf.length === 1) {
      return validateSchema(oneOf[0], value, options);
    } else if (discriminator && value && value[discriminator.propertyName]) {
      const discriminatedSchema = findSchema(
        oneOf,
        discriminator.propertyName,
        value[discriminator.propertyName],
        options,
      );
      if (discriminatedSchema) {
        return validateSchema(discriminatedSchema, value, options);
      }
    }

    const validations = map(item => validateSchema(item, value, options), oneOf);
    const matching = filter(isEmpty, validations);

    if (matching.length !== 1) {
      return [{ name: options.name, code: 'oneOf', param: matching.length }];
    }
  }
  return [];
};

const validateAllOf: Validator = ({ allOf }, value, options) =>
  allOf ? flatMap(item => validateSchema(item, value, options), allOf) : [];

const validateAnyOf: Validator = ({ anyOf }, value, options) => {
  if (anyOf && anyOf.length > 0) {
    if (anyOf.length === 1) {
      return validateSchema(anyOf[0], value, options);
    } else {
      if (!some(isEmpty, map(item => validateSchema(item, value, options), anyOf))) {
        return [{ name: options.name, code: 'anyOf' }];
      }
    }
  }
  return [];
};

const validateSchema = (
  schema: Schema | boolean,
  value: any,
  options: ValidateOptions,
): Invalid[] => {
  if (schema === false) {
    return [{ name: options.name, code: 'false' }];
  } else if (schema === true || schema === undefined || (schema.nullable && value === null)) {
    return [];
  }

  const errors: Invalid[] = [];

  return errors.concat(
    validateConst(schema, value, options),
    validateEnum(schema, value, options),
    validateType(schema, value, options),
    validateMultipleOf(schema, value, options),
    validateMinimum(schema, value, options),
    validateExclusiveMinimum(schema, value, options),
    validateMaximum(schema, value, options),
    validateExclusiveMaximum(schema, value, options),
    validatePattern(schema, value, options),
    validateMinLength(schema, value, options),
    validateMaxLength(schema, value, options),
    validateMinProperties(schema, value, options),
    validateMaxProperties(schema, value, options),
    validateRequired(schema, value, options),
    validateProperties(schema, value, options),
    validatePatternProperties(schema, value, options),
    validatePropertyNames(schema, value, options),
    validateDependencies(schema, value, options),
    validateAdditionalProperties(schema, value, options),
    validateMinItems(schema, value, options),
    validateMaxItems(schema, value, options),
    validateUniqueItems(schema, value, options),
    validateItems(schema, value, options),
    validateContains(schema, value, options),
    validateConditionals(schema, value, options),
    validateNot(schema, value, options),
    validateOneOf(schema, value, options),
    validateAllOf(schema, value, options),
    validateAnyOf(schema, value, options),
  );
};

export const validate = async (schema: Schema, value: any) => {
  const resolvedSchema = await resolveRefs(schema);
  return validateSchema(resolvedSchema, value, { name: 'value' }).map(error =>
    messages[error.code](error),
  );
};
