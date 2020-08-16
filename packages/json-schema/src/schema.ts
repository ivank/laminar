// JSON SCHEMA

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
  $recursiveRef?: string;
  $recursiveAnchor?: boolean;
  $id?: string;
  $anchor?: string;
  $defs?: { [key: string]: JsonSchema };
  id?: string;
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
  unevaluatedProperties?: boolean | Schema;
  unevaluatedItems?: boolean | Schema;
  maxContains?: number;
  minContains?: number;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: Schema;
  patternProperties?: { [key: string]: Schema };
  dependencies?: { [key: string]: string[] | Schema };
  dependentSchemas?: { [key: string]: Schema };
  dependentRequired?: { [key: string]: string[] };
  title?: string;
  description?: string;
  example?: string;
  enum?: unknown[];
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
  not?: Schema;
  discriminator?: { propertyName?: string };
  [key: string]: unknown;
}

export type Schema = JsonSchema | boolean;
