import { isEqual, some, uniqWith } from 'lodash/fp';
import fetch from 'node-fetch';

export type PrimitiveType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';

export interface Schema {
  $ref?: string;
  $id?: string;
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
  root: Schema;
  schemas: Map<string, Schema>;
  id?: string;
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

const isObject = (value: any): value is { [key: string]: any } =>
  typeof value === 'object' && !Array.isArray(value);

const validateEnum: Validator = (schema, value, { name }) =>
  schema.enum && !some(isEqual(value), schema.enum)
    ? [{ name, code: 'enum', param: schema.enum }]
    : [];

const validateType: Validator = ({ type, format }, value, { name }) => {
  const errors: Invalid[] = [];

  if (type) {
    const valueType =
      value === null
        ? 'null'
        : Array.isArray(value)
        ? 'array'
        : Number.isInteger(value)
        ? 'integer'
        : typeof value;
    const allowed = Array.isArray(type) ? type : [type];
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
    if (typeof exclusiveMinimum === 'boolean') {
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
    if (typeof exclusiveMaximum === 'boolean') {
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

const validateString: Validator = ({ type, format }, value, { name }) => {
  const errors: Invalid[] = [];
  if (type === 'string') {
    if (typeof value !== 'string') {
      errors.push({ name, code: 'type', param: type });
    } else if (format && format in formats && !formats[format].test(value)) {
      errors.push({ name, code: 'typeFormat', param: format });
    }
  }
  return errors;
};

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
  minProperties &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length < minProperties
    ? [{ name, code: 'minProperties', param: minProperties }]
    : [];

const validateMaxProperties: Validator = ({ maxProperties }, value, { name }) =>
  maxProperties &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length > maxProperties
    ? [{ name, code: 'maxProperties', param: maxProperties }]
    : [];

const validateRequired: Validator = ({ required }, value, { name }) => {
  if (required && required.length && isObject(value)) {
    const keys = Object.keys(value);
    const missingKeys = required.filter(key => !keys.includes(key));
    if (missingKeys.length > 0) {
      return [{ name, code: 'required', param: missingKeys }];
    }
  }
  return [];
};

const validateProperties: Validator = ({ properties }, value, options) => {
  const errors: Invalid[] = [];
  if (properties && isObject(value)) {
    return errors.concat(
      ...Object.keys(value).map(key =>
        validateSchema(properties[key], value[key], { ...options, name: `${options.name}.${key}` }),
      ),
    );
  }
  return errors;
};

const validatePatternProperties: Validator = ({ patternProperties }, value, options) => {
  const errors: Invalid[] = [];
  if (patternProperties && isObject(value)) {
    return errors.concat(
      ...Object.keys(patternProperties).map(pattern => {
        const regExp = RegExp(pattern);
        const matchingKeys = Object.keys(value).filter(key => regExp.test(key));
        const matchingSchema = patternProperties[pattern];
        return errors.concat(
          ...matchingKeys.map(key =>
            validateSchema(matchingSchema, value[key], {
              ...options,
              name: `${options.name}.${key}`,
            }),
          ),
        );
      }),
    );
  }
  return errors;
};

const validatePropertyNames: Validator = ({ propertyNames }, value, options) => {
  let errors: Invalid[] = [];
  if (propertyNames !== undefined && isObject(value)) {
    for (const key of Object.keys(value)) {
      errors = errors.concat(
        validateSchema(propertyNames, key, { ...options, name: `${options.name}.${key}` }),
      );
    }
  }
  return errors;
};

const validateDependencies: Validator = ({ dependencies }, value, options) => {
  let errors: Invalid[] = [];
  if (dependencies && isObject(value)) {
    const keys = Object.keys(value);
    const dependentKeys = Object.keys(dependencies).filter(key => keys.includes(key));

    for (const key of dependentKeys) {
      const dependency = dependencies[key];
      if (Array.isArray(dependency)) {
        if (dependency.find(item => !keys.includes(item))) {
          errors.push({ name: `${options.name}.${key}`, code: 'dependencies', param: dependency });
        }
      } else {
        errors = errors.concat(
          validateSchema(dependency, value, { ...options, name: `${options.name}.${key}` }),
        );
      }
    }
  }
  return errors;
};

const validateAdditionalProperties: Validator = (
  { additionalProperties, properties, patternProperties },
  value,
  options,
) => {
  let errors: Invalid[] = [];
  if (additionalProperties !== undefined && additionalProperties !== true && isObject(value)) {
    const additionalKeys = Object.keys(value)
      .filter(key => !(properties && key in properties))
      .filter(
        key =>
          !(
            patternProperties &&
            Object.keys(patternProperties).find(pattern => RegExp(pattern).test(key))
          ),
      );

    if (additionalKeys.length > 0) {
      if (additionalProperties === false) {
        errors.push({ name: options.name, code: 'additionalProperties', param: additionalKeys });
      } else if (typeof additionalProperties === 'object') {
        for (const key of additionalKeys) {
          errors = errors.concat(
            validateSchema(additionalProperties, value[key], {
              ...options,
              name: `${options.name}.${key}`,
            }),
          );
        }
      }
    }
  }

  return errors;
};

const validateMinItems: Validator = ({ minItems }, value, { name }) =>
  minItems && Array.isArray(value) && value.length < minItems
    ? [{ name, code: 'minItems', param: minItems }]
    : [];

const validateMaxItems: Validator = ({ maxItems }, value, { name }) =>
  maxItems && Array.isArray(value) && value.length > maxItems
    ? [{ name, code: 'maxItems', param: maxItems }]
    : [];

const validateUniqueItems: Validator = ({ uniqueItems }, value, { name }) =>
  uniqueItems && Array.isArray(value) && uniqWith(isEqual, value).length !== value.length
    ? [{ name, code: 'uniqueItems' }]
    : [];

const validateItems: Validator = ({ items, additionalItems }, value, options) => {
  let errors: Invalid[] = [];
  if (items !== undefined && Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemSchema = Array.isArray(items)
        ? items[index] === undefined
          ? additionalItems === undefined
            ? {}
            : additionalItems
          : items[index]
        : items;
      errors = errors.concat(
        validateSchema(itemSchema, item, { ...options, name: `${options.name}[${index}]` }),
      );
    });
  }
  return errors;
};

const validateContains: Validator = ({ contains }, value, options) => {
  let errors: Invalid[] = [];
  if (contains !== undefined && Array.isArray(value)) {
    errors = errors.concat(validateMinItems({ minItems: 1 }, value, options));
    const allItemsErrors = value.map((item, index) =>
      validateSchema(contains, item, { ...options, name: `${options.name}[${index}]` }),
    );
    if (allItemsErrors.every(itemErrors => itemErrors.length > 0)) {
      errors = errors.concat(...allItemsErrors);
    }
  }
  return errors;
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

const findDiscriminatedSchema = (
  schemas: Schema[],
  propertyName: string,
  propertyValue: any,
  options: ValidateOptions,
) =>
  schemas.find(item =>
    Boolean(
      'type' in item &&
        item.type === 'object' &&
        item.properties &&
        validateSchema(item.properties[propertyName], propertyValue, options).length === 0,
    ),
  );

const validateOneOf: Validator = ({ oneOf, discriminator }, value, options) => {
  if (oneOf && oneOf.length > 0) {
    if (oneOf.length === 1) {
      return validateSchema(oneOf[0], value, options);
    } else if (discriminator && value && value[discriminator.propertyName]) {
      const discriminatedSchema = findDiscriminatedSchema(
        oneOf,
        discriminator.propertyName,
        value[discriminator.propertyName],
        options,
      );
      if (discriminatedSchema) {
        return validateSchema(discriminatedSchema, value, options);
      }
    }

    const validations = oneOf.map(item => validateSchema(item, value, options));
    const matching = validations.filter(errors => errors.length === 0);

    return matching.length === 1
      ? []
      : [{ name: options.name, code: 'oneOf', param: matching.length }];
  } else {
    return [];
  }
};

const validateAllOf: Validator = ({ allOf }, value, options) =>
  allOf
    ? allOf.reduce<Invalid[]>(
        (errors, item) => [...errors, ...validateSchema(item, value, options)],
        [],
      )
    : [];

const validateAnyOf: Validator = ({ anyOf }, value, options) => {
  if (anyOf && anyOf.length > 0) {
    if (anyOf.length === 1) {
      return validateSchema(anyOf[0], value, options);
    } else {
      return anyOf.find(item => validateSchema(item, value, options).length === 0)
        ? []
        : [{ name: options.name, code: 'anyOf' }];
    }
  } else {
    return [];
  }
};

const parseJsonPointer = (name: string) =>
  decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

const getJsonPointer = (document: any, pointer?: string) =>
  pointer
    ? pointer
        .split('/')
        .reduce(
          (value, name) => (name ? (value ? value[parseJsonPointer(name)] : undefined) : value),
          document,
        )
    : document;

const getRef = (ref: string, { schemas, root }: ValidateOptions) => {
  const [url, pointer] = ref.split('#');
  const document = url ? schemas.get(url) : root;

  return [document, getJsonPointer(document, pointer)];
};

const validateSchema = (
  schema: Schema | boolean,
  value: any,
  options: ValidateOptions,
): Invalid[] => {
  if (schema === false) {
    return [{ name: options.name, code: 'false' }];
  }

  if (schema === true || schema === undefined || (schema.nullable && value === null)) {
    return [];
  }

  if (schema.$ref && typeof schema.$ref === 'string') {
    const [root, refSchema] = getRef(schema.$ref, options);

    return validateSchema(refSchema === undefined ? {} : refSchema, value, { ...options, root });
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
    validateString(schema, value, options),
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

const extractUrls = (document: any, urls: string[] = []): string[] => {
  if (document && typeof document === 'object') {
    if (
      '$ref' in document &&
      typeof document.$ref === 'string' &&
      document.$ref.includes('://') &&
      !urls.includes(document.$ref)
    ) {
      const [url] = document.$ref.split('#');
      urls.push(url);
    } else {
      Object.values(document).forEach(propValue => extractUrls(propValue, urls));
    }
  }
  return urls;
};

const loadJsonFiles = async (urls: string[]) => {
  const jsons = await Promise.all(urls.map(url => fetch(url).then(response => response.json())));

  return jsons.reduce<Map<string, any>>(
    (files, json, index) => files.set(urls[index], json),
    new Map(),
  );
};

export const validate = async (schema: Schema, value: any) =>
  validateSchema(schema, value, {
    name: 'value',
    root: schema,
    schemas: await loadJsonFiles(extractUrls(schema)),
  }).map(error => messages[error.code](error));
