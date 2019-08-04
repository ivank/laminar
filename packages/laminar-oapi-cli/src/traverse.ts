import { Document, DocumentContext } from '@ovotech/ts-compose';
import {
  ReferenceObject,
  SchemaObject,
  ResponseObject,
  RequestBodyObject,
  ParameterObject,
} from 'openapi3-ts';
import * as ts from 'typescript';
import { OapiValidationError } from './OapiValidationError';

export interface AstRefMap {
  [ref: string]: unknown;
}

export interface AstContext extends DocumentContext {
  root: SchemaObject;
  refs: AstRefMap;
}

export type AstConvert<TAstType = ts.TypeNode> = (
  context: AstContext,
  schema: unknown,
) => Document<TAstType, AstContext> | null;

export const isReferenceObject = (item: unknown): item is ReferenceObject =>
  typeof item === 'object' && !!item && '$ref' in item;

export const isResponseObject = (item: unknown): item is ResponseObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'description' in item;

export const isRequestBodyObject = (item: unknown): item is RequestBodyObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'content' in item;

export const isParameterObject = (item: unknown): item is ParameterObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'in' in item && 'name' in item;

export const isSchemaObject = (item: unknown): item is SchemaObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item;

export const getReferencedObject = <T>(
  item: T | ReferenceObject,
  guard: (item: unknown) => item is T,
  context: AstContext,
): T => {
  if (isReferenceObject(item)) {
    if (!context.refs[item.$ref]) {
      throw new OapiValidationError('Reference Error', [`Reference [${item.$ref}] not found`]);
    }
    const resolved = context.refs[item.$ref];
    if (!guard(resolved)) {
      throw new OapiValidationError(`Reference Error`, [`${item.$ref} was not the correct type`]);
    }
    return resolved;
  } else {
    return item;
  }
};
