export interface StringType extends BaseType {
  type: 'string';
  pattern?: string;
  enum?: string[];
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
  enum?: number[];
}

export interface BooleanType extends BaseType {
  type: 'boolean';
}

export interface ArrayType extends BaseType {
  type: 'array';
  items?: Schema | Schema[];
  additionalItems?: boolean | Schema;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
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
  BOOLEAN,
  NUMBER,
  NUMBER_INTEGER,
  NUMBER_ENUM,
  NUMBER_MULTIPLE_OF,
  NUMBER_MIN,
  NUMBER_EXCLUSIVE_MIN,
  NUMBER_MAX,
  NUMBER_EXCLUSIVE_MAX,
  STRING,
  STRING_PATTERN,
  STRING_FORMAT,
  STRING_ENUM,
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

export const message = ({ code, name, param }: Invalid): string => {
  switch (code) {
    case Code.BOOLEAN:
      return `"${name}" should be a boolean`;
    case Code.NUMBER:
      return `"${name}" should be a number`;
    case Code.NUMBER_INTEGER:
      return `"${name}" should be an integer`;
    case Code.NUMBER_ENUM:
      return `"${name}" should be one of [${param.join(', ')}]`;
    case Code.NUMBER_MULTIPLE_OF:
      return `"${name}" should be a multiple of ${param}`;
    case Code.NUMBER_MIN:
      return `"${name}" should be >= ${param}`;
    case Code.NUMBER_EXCLUSIVE_MIN:
      return `"${name}" should be > ${param}`;
    case Code.NUMBER_MAX:
      return `"${name}" should be <= ${param}`;
    case Code.NUMBER_EXCLUSIVE_MAX:
      return `"${name}" should be < ${param}`;
    case Code.STRING:
      return `"${name}" should be a string`;
    case Code.STRING_PATTERN:
      return `"${name}" should match /${param}/`;
    case Code.STRING_FORMAT:
      return `"${name}" should match ${param} format`;
    case Code.STRING_ENUM:
      return `"${name}" should be one of [${param.join(', ')}]`;
    case Code.STRING_MAX_LENGTH:
      return `"${name}" should have length <= ${param}`;
    case Code.STRING_MIN_LENGTH:
      return `"${name}" should have length >= ${param}`;
    case Code.OBJECT:
      return `"${name}" should be an object`;
    case Code.OBJECT_UNKNOWN:
      return `"${name}" key is unknown`;
    case Code.OBJECT_REQUIRED:
      return `"${name}" key is missing`;
    case Code.OBJECT_PROPERTY_NAME:
      return `"${name}" key does not match /${param}/`;
    case Code.OBJECT_MIN_PROPS:
      return `"${name}" should have >= ${param} keys`;
    case Code.OBJECT_MAX_PROPS:
      return `"${name}" should have <= ${param} keys`;
    case Code.OBJECT_DEPENDANCY:
      return `"${name}" requires [${param.join(', ')}] keys`;
    case Code.ARRAY:
      return `"${name}" should be an array`;
    case Code.ARRAY_UNIQUE:
      return `"${name}" should have only unique values`;
    case Code.ARRAY_UNKNOWN:
      return `"${name}" item is unknown`;
    case Code.ONE_OF:
      return `"${name}" should match only 1 schema, matching ${param}`;
    case Code.ANY_OF:
      return `"${name}" should match at least 1 schema`;
  }
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

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({ name, code: Code.NUMBER_ENUM, param: schema.enum });
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

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({ name, code: Code.STRING_ENUM, param: schema.enum });
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
): Schema | undefined => (Array.isArray(items) ? items[index] || additionalItems : items);

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

    if (schema.uniqueItems && new Set(value).size !== value.length) {
      errors.push({ name, code: Code.ARRAY_UNIQUE });
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
  if ('type' in schema) {
    if (schema.nullable && value === null) {
      return [];
    }

    switch (schema.type) {
      case 'boolean':
        return validateBoolean(schema, value, options);
      case 'number':
      case 'integer':
        return validateNumber(schema, value, options);
      case 'string':
        return validateString(schema, value, options);
      case 'object':
        return validateObject(schema, value, options);
      case 'array':
        return validateArray(schema, value, options);
      default:
        return [];
    }
  } else if ('oneOf' in schema) {
    return validateOneOf(schema, value, options);
  } else if ('allOf' in schema) {
    return validateAllOf(schema, value, options);
  } else if ('anyOf' in schema) {
    return validateAnyOf(schema, value, options);
  } else if ('required' in schema || 'properties' in schema || 'patternProperties' in schema) {
    return validateObject(schema, value, options);
  } else {
    return [];
  }
};

export const validate = (schema: Schema, value: any) => {
  return validateSchema(schema, value, { name: 'value' }).map(message);
};
