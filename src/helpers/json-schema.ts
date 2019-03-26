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
  items: Schema;
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
  patternProperties?: { [key: string]: Schema };
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

export interface ValidationError {
  message: string;
}

export interface ValidateOptions {
  name: string;
}

export type Validator<TSchema> = (
  schema: TSchema,
  value: any,
  options: ValidateOptions,
) => ValidationError[];

export const validateNumber: Validator<NumberType> = (schema, value, { name }) => {
  const result: ValidationError[] = [];

  if (typeof value !== 'number') {
    result.push({ message: `${name} is not a number` });
  } else {
    if (schema.type === 'integer' && !Number.isInteger(value)) {
      result.push({ message: `${name} is not an integer` });
    }

    if (schema.enum && !schema.enum.includes(value)) {
      result.push({ message: `${name} is not part of ${schema.enum}` });
    }

    if (schema.multipleOf && value % schema.multipleOf !== 0) {
      result.push({ message: `${name} is not a multiple of ${schema.multipleOf}` });
    }

    if (schema.minimum) {
      if (schema.exclusiveMinimum) {
        if (value <= schema.minimum) {
          result.push({ message: `${name} should be > ${schema.minimum}` });
        }
      } else {
        if (value < schema.minimum) {
          result.push({ message: `${name} should be ≥ ${schema.minimum}` });
        }
      }
    }

    if (schema.maximum) {
      if (schema.exclusiveMaximum) {
        if (value >= schema.maximum) {
          result.push({ message: `${name} should be < ${schema.maximum}` });
        }
      } else {
        if (value > schema.maximum) {
          result.push({ message: `${name} should be ≤ ${schema.maximum}` });
        }
      }
    }
  }

  return result;
};

export const validateString: Validator<StringType> = (schema, value, { name }) => {
  const result: ValidationError[] = [];

  if (typeof value !== 'string') {
    result.push({ message: `${name} is not a string` });
  } else {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      result.push({ message: `${name} does not match /${schema.pattern}/` });
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      result.push({ message: `${name} has length > ${schema.maxLength}` });
    }

    if (schema.minLength && value.length < schema.minLength) {
      result.push({ message: `${name} has length < ${schema.minLength}` });
    }
  }

  return result;
};

export const getPropertySchema = (schema: ObjectType, key: string): Schema | undefined => {
  if (schema.properties && schema.properties[key]) {
    return schema.properties[key];
  } else if (schema.patternProperties) {
    const match = Object.keys(schema.patternProperties).find(pattern =>
      new RegExp(pattern).test(key),
    );
    return match ? schema.patternProperties[match] : undefined;
  } else if (typeof schema.additionalProperties === 'object') {
    return schema.additionalProperties;
  }
  return undefined;
};

export const validateObject: Validator<ObjectType> = (schema, value, { name }) => {
  let result: ValidationError[] = [];

  if (typeof value !== 'object') {
    result.push({ message: `${name} is not a object` });
  } else {
    const keys = Object.keys(value);
    for (const key of keys) {
      const itemSchema = getPropertySchema(schema, key);
      if (itemSchema) {
        result = result.concat(validate(itemSchema, value[key], { name: `${name}.${key}` }));
      } else if (schema.additionalProperties === false) {
        result.push({ message: `${name}.${key} is unknown` });
      }
    }

    if (schema.minProperties && keys.length < schema.minProperties) {
      result.push({ message: `${name} props count should be ≥ ${schema.minProperties}` });
    }

    if (schema.maxProperties && keys.length > schema.maxProperties) {
      result.push({ message: `${name} props count should be ≤ ${schema.maxProperties}` });
    }

    if (schema.required) {
      for (const requiredKey of schema.required) {
        if (!keys.includes(requiredKey)) {
          result.push({ message: `${name}.${requiredKey} is required` });
        }
      }
    }
  }

  return result;
};

export const validateArray: Validator<ArrayType> = (schema, value, { name }) => {
  let result: ValidationError[] = [];

  if (!Array.isArray(value)) {
    result.push({ message: `${name} is not an array` });
  } else {
    value.forEach((item, index) => {
      result = result.concat(validate(schema.items, item, { name: `${name}[${index}]` }));
    });
  }

  return result;
};

export const validateOneOf: Validator<OneOfType> = (schema, value, options) => {
  const validations = schema.oneOf.map(item => validate(item, value, options));

  return validations.filter(errors => errors.length === 0).length === 1
    ? []
    : [{ message: `${options.name} must match exactly one schema` }];
};

export const validateAllOf: Validator<AllOfType> = (schema, value, options) => {
  let errors: ValidationError[] = [];
  for (const item of schema.allOf) {
    errors = errors.concat(validate(item, value, options));
  }
  return errors;
};

export const validateAnyOf: Validator<AnyOfType> = (schema, value, options) => {
  return schema.anyOf.find(item => validate(item, value, options).length === 0)
    ? []
    : [{ message: `${options.name} does not match any schema` }];
};

export const validate: Validator<Schema> = (schema, value, options) => {
  if ('type' in schema) {
    switch (schema.type) {
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
  } else {
    return [];
  }
};
