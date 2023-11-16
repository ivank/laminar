import { Document, DocumentContext } from '@laminar/ts-compose';
import { oas31 } from 'openapi3-ts';
import ts from 'typescript';

export interface AstRefMap {
  [ref: string]: unknown;
}

export interface AstContext extends DocumentContext {
  root: oas31.SchemaObject;
  refs: AstRefMap;
  convertDates?: boolean;
  optionalDefaults?: boolean;
}

export type AstConvert<TAstType = ts.TypeNode> = (
  context: AstContext,
  schema: unknown,
) => Document<TAstType, AstContext> | null;

export const isReferenceObject = (item: unknown): item is oas31.ReferenceObject =>
  typeof item === 'object' && !!item && '$ref' in item;

export const isResponseObject = (item: unknown): item is oas31.ResponseObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'description' in item;

export const isMediaTypeObject = (item: unknown): item is oas31.MediaTypeObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'schema' in item;

export const isRequestBodyObject = (item: unknown): item is oas31.RequestBodyObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'content' in item;

export const isParameterObject = (item: unknown): item is oas31.ParameterObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'in' in item && 'name' in item;

export const isSecuritySchemaObject = (item: unknown): item is oas31.SecuritySchemeObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item && 'type' in item;

export const isSchemaObject = (item: unknown): item is oas31.SchemaObject & { [index: string]: unknown } =>
  !isReferenceObject(item) && typeof item === 'object' && !!item;

export const isPathItemObject = (item: unknown): item is oas31.PathItemObject =>
  !isReferenceObject(item) && typeof item === 'object' && !!item;

export const getReferencedObject = <T>(
  item: T | oas31.ReferenceObject,
  guard: (item: unknown) => item is T,
  type: string,
  context: AstContext,
): T => {
  if (isReferenceObject(item)) {
    if (!context.refs[item.$ref]) {
      throw new Error(`Reference Error |${JSON.stringify(item)}| not found`);
    }
    const resolved = getReferencedObject(context.refs[item.$ref], guard, type, context);
    if (!guard(resolved)) {
      throw new Error(
        `Reference Error, the reference |${JSON.stringify(item)}| which was resolved to |${JSON.stringify(
          resolved,
        )}| was not the expected type "${type}"`,
      );
    }
    return resolved;
  } else {
    return item;
  }
};
