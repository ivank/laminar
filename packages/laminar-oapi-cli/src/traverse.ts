import { RefMap } from '@ovotech/json-refs';
import { ReferenceObject, SchemaObject } from 'openapi3-ts';
import * as ts from 'typescript';

export interface Registry {
  [key: string]: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
}

export interface AstContext {
  root: SchemaObject;
  registry: Registry;
  imports: { [key: string]: string[] };
  refs: RefMap;
}

export interface Result<TAstType = ts.TypeNode> {
  type: TAstType;
  context: AstContext;
}

export type AstConvert<TAstType = ts.TypeNode> = (
  context: AstContext,
  schema: any,
) => Result<TAstType> | null;

export const result = <TAstType = ts.TypeNode>(
  context: AstContext,
  type: TAstType,
): Result<TAstType> => ({
  context,
  type,
});

export const isSchema = (schema: any): schema is SchemaObject =>
  schema && typeof schema === 'object';

export const mapContext = <T = any, TAstType = ts.TypeNode>(
  context: AstContext,
  items: T[],
  callbackfn: (context: AstContext, item: T) => Result<TAstType>,
) =>
  items.reduce<{ items: TAstType[]; context: AstContext }>(
    (all, item) => {
      const current = callbackfn(all.context, item);
      return {
        items: [...all.items, current.type],
        context: current.context,
      };
    },
    { items: [], context },
  );

export const withEntry = (
  context: AstContext,
  entry: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
): AstContext => ({
  ...context,
  registry: {
    ...context.registry,
    [entry.name.text]: entry,
  },
});

export const withImports = (context: AstContext, module: string, names: string[]): AstContext => {
  const current = context.imports[module] || [];

  return {
    ...context,
    imports: {
      ...context.imports,
      [module]: current.concat(names.filter(item => !current.includes(item))),
    },
  };
};

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
