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
  [key: string]: unknown;
}

export type Schema = JsonSchema | boolean;

export interface RefSchema {
  $ref: string;
  [key: string]: unknown;
}
export interface RefMap {
  [ref: string]: Schema;
}

export interface TraversableSchema {
  [key: string]: Schema;
}

export interface Context {
  schema: Schema;
  refs: RefMap;
}

export interface FileContext {
  parentId?: string;
  cwd?: string;
  uris?: string[];
}

export interface LoadedSchema {
  uri: string;
  content: Schema;
  cwd?: string;
}

export interface ResolvedSchema {
  schema: Schema;
  refs: RefMap;
  uris: string[];
}
