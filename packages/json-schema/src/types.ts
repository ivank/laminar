import { RefMap, JsonObject, ResolvedJsonObject } from '@ovotech/json-refs';

export interface Discriminator {
  propertyName: string;
}

export interface Invalid<TParam = unknown> {
  code: keyof Messages;
  name: string;
  param: TParam;
}

export interface ValidateOptions {
  name: string;
  validators: Validator[];
  refs: RefMap;
}

export interface OapiJsonSchema extends JsonSchema {
  not?: Schema;
  discriminator?: {
    propertyName?: string;
  };
}

export type Validator<TSchema = OapiJsonSchema, TValue = unknown> = (
  schema: TSchema,
  value: TValue,
  options: ValidateOptions,
) => Invalid[];

export interface Messages {
  [key: string]: (error: Invalid) => string;
}

export interface ValidationResult {
  schema: ResolvedSchema;
  errors: string[];
  valid: boolean;
}

// JSON SCHEMA

export type PrimitiveType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

export interface JsonSchema extends JsonObject {
  if?: Schema;
  then?: Schema;
  else?: Schema;
  type?: PrimitiveType | PrimitiveType[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  const?: unknown;
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
  enum?: unknown[];
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
}

export type Schema = JsonSchema | boolean;

export interface ResolvedSchema extends ResolvedJsonObject {
  schema: Schema;
}
