export type PrimitiveType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

export interface JsonSchema {
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
  additionalProperties?: boolean | Schema;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: Schema;
  patternProperties?: { [key: string]: Schema };
  dependencies?: { [key: string]: string[] | Schema };
  title?: string;
  description?: string;
  enum?: any[];
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
  [key: string]: any;
}

export type Schema = JsonSchema | boolean;

export interface Discriminator {
  propertyName: string;
}

export interface Invalid<TParam = any> {
  code: keyof Messages;
  name: string;
  param: TParam;
}

export interface Result {
  errors: Invalid[];
  valid?: boolean;
}

export interface ValidateOptions {
  name: string;
  validators: Validator[];
}

export type Validator<TSchema = Schema, TValue = any> = (
  schema: TSchema,
  value: TValue,
  options: ValidateOptions,
) => Result;

export interface Messages {
  [key: string]: (error: Invalid) => string;
}
