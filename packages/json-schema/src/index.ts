import { isEqual, some, uniq } from 'lodash/fp';

export interface StringType extends BaseType {
  type: 'string';
  pattern?: string;
  minLength?: number;
  maxLength?: number;
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
}

export interface NumberType extends BaseType {
  type: 'integer' | 'number';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
}

export interface BooleanType extends BaseType {
  type: 'boolean';
}

export interface ArrayType extends BaseType {
  type: 'array';
  items?: Schema | Schema[];
  additionalItems?: boolean | Schema;
  uniqueItems?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectType extends BaseType {
  type: 'object';
  properties?: { [key: string]: Schema };
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  additionalProperties?: boolean | Schema;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: { pattern: string };
  patternProperties?: { [key: string]: Schema };
  dependencies?: { [key: string]: string[] | Schema };
}

export interface BaseType {
  title?: string;
  description?: string;
  nullable?: boolean;
  enum?: any[];
}

export interface Discriminator {
  propertyName: string;
}

export interface OneOfType {
  oneOf: Schema[];
  discriminator?: Discriminator;
}

export interface AllOfType {
  allOf: Schema[];
  discriminator?: Discriminator;
}

export interface AnyOfType {
  anyOf: Schema[];
  discriminator?: Discriminator;
}

export type Schema =
  | StringType
  | NumberType
  | BooleanType
  | ArrayType
  | ObjectType
  | OneOfType
  | AllOfType
  | AnyOfType
  | {};

export interface Invalid {
  code: Code;
  name: string;
  param?: any;
}

const enum Code {
  ENUM,
  BOOLEAN,
  NUMBER,
  NUMBER_INTEGER,
  NUMBER_MULTIPLE_OF,
  NUMBER_MIN,
  NUMBER_EXCLUSIVE_MIN,
  NUMBER_MAX,
  NUMBER_EXCLUSIVE_MAX,
  STRING,
  STRING_PATTERN,
  STRING_FORMAT,
  STRING_MAX_LENGTH,
  STRING_MIN_LENGTH,
  OBJECT,
  OBJECT_REQUIRED,
  OBJECT_MIN_PROPS,
  OBJECT_MAX_PROPS,
  OBJECT_UNKNOWN,
  OBJECT_PROPERTY_NAME,
  OBJECT_DEPENDANCY,
  ARRAY,
  ARRAY_UNIQUE,
  ARRAY_MIN_ITEMS,
  ARRAY_MAX_ITEMS,
  ARRAY_UNKNOWN,
  ONE_OF,
  ANY_OF,
}

export interface ValidateOptions {
  name: string;
}

export type Validator<TSchema> = (
  schema: TSchema,
  value: any,
  options: ValidateOptions,
) => Invalid[];

type Messages = { [key in Code]: (error: Invalid) => string };

export const messages: Messages = {
  [Code.ENUM]: ({ name, param }) => `"${name}" should be one of [${param.join(', ')}]`,
  [Code.BOOLEAN]: ({ name }) => `"${name}" should be a boolean`,
  [Code.NUMBER]: ({ name }) => `"${name}" should be a number`,
  [Code.NUMBER_INTEGER]: ({ name }) => `"${name}" should be an integer`,
  [Code.NUMBER_MULTIPLE_OF]: ({ name, param }) => `"${name}" should be a multiple of ${param}`,
  [Code.NUMBER_MIN]: ({ name, param }) => `"${name}" should be >= ${param}`,
  [Code.NUMBER_EXCLUSIVE_MIN]: ({ name, param }) => `"${name}" should be > ${param}`,
  [Code.NUMBER_MAX]: ({ name, param }) => `"${name}" should be <= ${param}`,
  [Code.NUMBER_EXCLUSIVE_MAX]: ({ name, param }) => `"${name}" should be < ${param}`,
  [Code.STRING]: ({ name }) => `"${name}" should be a string`,
  [Code.STRING_PATTERN]: ({ name, param }) => `"${name}" should match /${param}/`,
  [Code.STRING_FORMAT]: ({ name, param }) => `"${name}" should match ${param} format`,
  [Code.STRING_MAX_LENGTH]: ({ name, param }) => `"${name}" should have length <= ${param}`,
  [Code.STRING_MIN_LENGTH]: ({ name, param }) => `"${name}" should have length >= ${param}`,
  [Code.OBJECT]: ({ name }) => `"${name}" should be an object`,
  [Code.OBJECT_UNKNOWN]: ({ name }) => `"${name}" key is unknown`,
  [Code.OBJECT_REQUIRED]: ({ name }) => `"${name}" key is missing`,
  [Code.OBJECT_PROPERTY_NAME]: ({ name, param }) => `"${name}" key does not match /${param}/`,
  [Code.OBJECT_MIN_PROPS]: ({ name, param }) => `"${name}" should have >= ${param} keys`,
  [Code.OBJECT_MAX_PROPS]: ({ name, param }) => `"${name}" should have <= ${param} keys`,
  [Code.OBJECT_DEPENDANCY]: ({ name, param }) => `"${name}" requires [${param.join(', ')}] keys`,
  [Code.ARRAY]: ({ name }) => `"${name}" should be an array`,
  [Code.ARRAY_UNIQUE]: ({ name }) => `"${name}" should have only unique values`,
  [Code.ARRAY_MIN_ITEMS]: ({ name, param }) => `"${name}" should have >= ${param} items`,
  [Code.ARRAY_MAX_ITEMS]: ({ name, param }) => `"${name}" should have <= ${param} items`,
  [Code.ARRAY_UNKNOWN]: ({ name }) => `"${name}" item is unknown`,
  [Code.ONE_OF]: ({ name, param }) => `"${name}" should match only 1 schema, matching ${param}`,
  [Code.ANY_OF]: ({ name }) => `"${name}" should match at least 1 schema`,
};

export const validateGeneral: Validator<Schema> = (schema, value, { name }) => {
  const errors: Invalid[] = [];

  if ('enum' in schema && schema.enum && !some(isEqual(value), schema.enum)) {
    errors.push({ name, code: Code.ENUM, param: schema.enum });
  }

  return errors;
};

export const validateBoolean: Validator<BooleanType> = (schema, value, { name }) => {
  const errors: Invalid[] = [];

  if (typeof value !== 'boolean') {
    errors.push({ name, code: Code.BOOLEAN });
  }

  return errors;
};

export const validateNumber: Validator<NumberType> = (schema, value, { name }) => {
  const errors: Invalid[] = [];

  if (typeof value !== 'number') {
    errors.push({ name, code: Code.NUMBER });
  } else {
    if (schema.type === 'integer' && !Number.isInteger(value)) {
      errors.push({ name, code: Code.NUMBER_INTEGER });
    }

    if (schema.multipleOf && value % schema.multipleOf !== 0) {
      errors.push({ name, code: Code.NUMBER_MULTIPLE_OF, param: schema.multipleOf });
    }

    if (schema.minimum) {
      if (schema.exclusiveMinimum) {
        if (value <= schema.minimum) {
          errors.push({ name, code: Code.NUMBER_EXCLUSIVE_MIN, param: schema.minimum });
        }
      } else {
        if (value < schema.minimum) {
          errors.push({ name, code: Code.NUMBER_MIN, param: schema.minimum });
        }
      }
    }

    if (schema.maximum) {
      if (schema.exclusiveMaximum) {
        if (value >= schema.maximum) {
          errors.push({ name, code: Code.NUMBER_EXCLUSIVE_MAX, param: schema.maximum });
        }
      } else {
        if (value > schema.maximum) {
          errors.push({ name, code: Code.NUMBER_MAX, param: schema.maximum });
        }
      }
    }
  }

  return errors;
};

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

export const validateString: Validator<StringType> = (schema, value, { name }) => {
  const errors: Invalid[] = [];

  if (typeof value !== 'string') {
    errors.push({ name, code: Code.STRING });
  } else {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({ name, code: Code.STRING_PATTERN, param: schema.pattern });
    }

    if (schema.format && schema.format in formats && !formats[schema.format].test(value)) {
      errors.push({ name, code: Code.STRING_FORMAT, param: schema.format });
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({ name, code: Code.STRING_MAX_LENGTH, param: schema.maxLength });
    }

    if (schema.minLength && value.length < schema.minLength) {
      errors.push({ name, code: Code.STRING_MIN_LENGTH, param: schema.minLength });
    }
  }

  return errors;
};

export const findPropertySchema = (
  { properties, patternProperties, additionalProperties }: ObjectType,
  key: string,
): Schema | undefined => {
  if (properties && properties[key]) {
    return properties[key];
  } else if (patternProperties) {
    const match = Object.keys(patternProperties).find(pattern => RegExp(pattern).test(key));
    return match ? patternProperties[match] : undefined;
  } else if (typeof additionalProperties === 'object') {
    return additionalProperties;
  } else {
    return undefined;
  }
};

export const validateObject: Validator<ObjectType> = (schema, value, { name }) => {
  let errors: Invalid[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push({ name, code: Code.OBJECT });
  } else {
    const keys = Object.keys(value);
    for (const key of keys) {
      const keyName = `${name}.${key}`;
      if (schema.propertyNames && !new RegExp(schema.propertyNames.pattern).test(key)) {
        errors.push({
          name: keyName,
          code: Code.OBJECT_PROPERTY_NAME,
          param: schema.propertyNames.pattern,
        });
      }

      const itemSchema = findPropertySchema(schema, key);
      if (itemSchema) {
        errors = errors.concat(validateSchema(itemSchema, value[key], { name: keyName }));
      } else if (schema.additionalProperties === false) {
        errors.push({ name: `${name}.${key}`, code: Code.OBJECT_UNKNOWN });
      }

      if (schema.dependencies && schema.dependencies[key]) {
        const dependency = schema.dependencies[key];
        if (Array.isArray(dependency)) {
          if (dependency.find(item => !keys.includes(item))) {
            errors.push({ name: keyName, code: Code.OBJECT_DEPENDANCY, param: dependency });
          }
        } else {
          errors = errors.concat(validateSchema(dependency, value, { name }));
        }
      }
    }

    if (schema.minProperties && keys.length < schema.minProperties) {
      errors.push({ name, code: Code.OBJECT_MIN_PROPS, param: schema.minProperties });
    }

    if (schema.maxProperties && keys.length > schema.maxProperties) {
      errors.push({ name, code: Code.OBJECT_MAX_PROPS, param: schema.maxProperties });
    }

    if (schema.required) {
      for (const key of schema.required) {
        if (!keys.includes(key)) {
          errors.push({ name: `${name}.${key}`, code: Code.OBJECT_REQUIRED });
        }
      }
    }
  }

  return errors;
};

export const findItemSchema = (
  { items, additionalItems }: ArrayType,
  index: number,
): Schema | undefined => (Array.isArray(items) ? items[index] || additionalItems : items || {});

export const validateArray: Validator<ArrayType> = (schema, value, { name }) => {
  let errors: Invalid[] = [];

  if (!Array.isArray(value)) {
    errors.push({ name, code: Code.ARRAY });
  } else {
    if (schema.items) {
      value.forEach((item, index) => {
        const itemSchema = findItemSchema(schema, index);
        const itemName = `${name}[${index}]`;
        if (itemSchema) {
          errors = errors.concat(validateSchema(itemSchema, item, { name: itemName }));
        } else if (schema.additionalItems === false) {
          errors.push({ name: itemName, code: Code.ARRAY_UNKNOWN });
        }
      });
    }

    if (schema.uniqueItems && !uniq(value)) {
      errors.push({ name, code: Code.ARRAY_UNIQUE });
    }

    if (schema.minItems && value.length < schema.minItems) {
      errors.push({ name, code: Code.ARRAY_MIN_ITEMS, param: schema.minItems });
    }

    if (schema.maxItems && value.length > schema.maxItems) {
      errors.push({ name, code: Code.ARRAY_MAX_ITEMS, param: schema.maxItems });
    }
  }

  return errors;
};

export const findDiscriminatedSchema = (
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

export const validateOneOf: Validator<OneOfType> = (schema, value, options) => {
  if (schema.oneOf.length === 0) {
    return [];
  } else if (schema.oneOf.length === 1) {
    return validateSchema(schema.oneOf[0], value, options);
  } else if (schema.discriminator && value && value[schema.discriminator.propertyName]) {
    const discriminatedSchema = findDiscriminatedSchema(
      schema.oneOf,
      schema.discriminator.propertyName,
      value[schema.discriminator.propertyName],
      options,
    );
    if (discriminatedSchema) {
      return validateSchema(discriminatedSchema, value, options);
    }
  }

  const validations = schema.oneOf.map(item => validateSchema(item, value, options));
  const matching = validations.filter(errors => errors.length === 0);

  return matching.length === 1
    ? []
    : [{ name: options.name, code: Code.ONE_OF, param: matching.length }];
};

export const validateAllOf: Validator<AllOfType> = (schema, value, options) => {
  return schema.allOf.reduce<Invalid[]>(
    (errors, item) => [...errors, ...validateSchema(item, value, options)],
    [],
  );
};

export const validateAnyOf: Validator<AnyOfType> = (schema, value, options) => {
  if (schema.anyOf.length === 0) {
    return [];
  } else if (schema.anyOf.length === 1) {
    return validateSchema(schema.anyOf[0], value, options);
  } else {
    return schema.anyOf.find(item => validateSchema(item, value, options).length === 0)
      ? []
      : [{ name: options.name, code: Code.ANY_OF }];
  }
};

export const validateSchema: Validator<Schema> = (schema, value, options) => {
  if ('nullable' in schema && schema.nullable && value === null) {
    return [];
  }

  let errors = validateGeneral(schema, value, options);

  if (
    ('type' in schema && schema.type === 'object') ||
    'required' in schema ||
    'properties' in schema ||
    'patternProperties' in schema
  ) {
    errors = errors.concat(errors.concat(validateObject(schema, value, options)));
  } else if (
    ('type' in schema && (schema.type === 'number' || schema.type === 'integer')) ||
    'minimum' in schema ||
    'maximum' in schema ||
    'multipleOf' in schema
  ) {
    errors = errors.concat(validateNumber(schema, value, options));
  } else if (
    ('type' in schema && schema.type === 'string') ||
    'maxLength' in schema ||
    'minLength' in schema ||
    'pattern' in schema
  ) {
    errors = errors.concat(validateString(schema, value, options));
  } else if (
    ('type' in schema && schema.type === 'array') ||
    'items' in schema ||
    'minItems' in schema ||
    'maxItems' in schema ||
    'additionalItems' in schema ||
    'uniqueItems' in schema
  ) {
    errors = errors.concat(validateArray(schema, value, options));
  } else if ('type' in schema && schema.type === 'boolean') {
    errors = errors.concat(validateBoolean(schema, value, options));
  } else if ('oneOf' in schema) {
    errors = errors.concat(validateOneOf(schema, value, options));
  } else if ('allOf' in schema) {
    errors = errors.concat(validateAllOf(schema, value, options));
  } else if ('anyOf' in schema) {
    errors = errors.concat(validateAnyOf(schema, value, options));
  }

  return errors;
};

export const validate = (schema: Schema, value: any) =>
  validateSchema(schema, value, { name: 'value' }).map(error => messages[error.code](error));
