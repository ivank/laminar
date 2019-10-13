export interface JsonObject {
  $ref?: string;
  $id?: string;
  id?: string;
  [key: string]: unknown;
}

export type JsonPointerObject = JsonObject | boolean;

export interface RefSchema {
  $ref: string;
  [key: string]: unknown;
}
export interface RefMap {
  [ref: string]: JsonPointerObject;
}

export interface TraversableJsonObject {
  [key: string]: JsonPointerObject;
}

export interface Context {
  schema: JsonPointerObject;
  refs: RefMap;
}

export interface FileContext {
  parentId?: string;
  cwd?: string;
  uris?: string[];
}

export interface LoadedJsonObject {
  uri: string;
  content: JsonPointerObject;
  cwd?: string;
}

export interface ResolvedJsonObject {
  schema: JsonPointerObject;
  refs: RefMap;
  uris: string[];
}
