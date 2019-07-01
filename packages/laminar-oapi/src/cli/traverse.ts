import { RefMap } from '@ovotech/json-refs';
import { Document, DocumentContext } from '@ovotech/ts-compose';
import { ReferenceObject, SchemaObject } from 'openapi3-ts';
import * as ts from 'typescript';

export interface AstContext extends DocumentContext {
  root: SchemaObject;
  refs: RefMap;
}

export type AstConvert<TAstType = ts.TypeNode> = (
  context: AstContext,
  schema: any,
) => Document<TAstType, AstContext> | null;

export const isSchema = (schema: any): schema is SchemaObject =>
  schema && typeof schema === 'object';

export const isRef = (item: any): item is ReferenceObject =>
  typeof item === 'object' && '$ref' in item && typeof item.$ref === 'string';

export const withRef = <T = any>(item: T | ReferenceObject, context: AstContext): T => {
  if (isRef(item)) {
    if (!context.refs[item.$ref]) {
      throw Error(`Reference [${item.$ref}] not found`);
    }
    return context.refs[item.$ref];
  } else {
    return item;
  }
};
