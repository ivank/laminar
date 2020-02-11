import * as ts from 'typescript';
import { Import } from './node';
import { printNode } from './print';

export interface Identifiers {
  [key: string]: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.VariableStatement;
}

export interface DocumentContext {
  identifiers: Identifiers;
  imports: { [key: string]: string[] };
}

export interface Document<
  TAstType = ts.TypeNode,
  TContext extends DocumentContext = DocumentContext
> {
  type: TAstType;
  context: TContext;
}

export const document = <
  TAstType = ts.TypeNode,
  TContext extends DocumentContext = DocumentContext
>(
  context: TContext,
  type: TAstType,
): Document<TAstType, TContext> => ({
  context,
  type,
});

export const mapWithContext = <
  T = unknown,
  TAstType = ts.TypeNode,
  TContext extends DocumentContext = DocumentContext
>(
  context: TContext,
  items: T[],
  callbackfn: (context: TContext, item: T) => Document<TAstType, TContext>,
): { items: TAstType[]; context: TContext } =>
  items.reduce<{ items: TAstType[]; context: TContext }>(
    (all, item) => {
      const current = callbackfn(all.context, item);
      return {
        items: [...all.items, current.type],
        context: current.context,
      };
    },
    { items: [], context },
  );

export const withIdentifier = <TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  identifier: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.VariableStatement,
): TContext => ({
  ...context,
  identifiers: {
    ...context.identifiers,
    ['declarationList' in identifier
      ? (identifier.declarationList.declarations[0].name as ts.Identifier).text
      : identifier.name.text]: identifier,
  },
});

export const withImports = <TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  module: string,
  names: string[],
): TContext => {
  const current = context.imports[module] || [];

  return {
    ...context,
    imports: {
      ...context.imports,
      [module]: current.concat(names.filter(item => !current.includes(item))),
    },
  };
};

export const printDocument = <T extends ts.Node>(doc: Document<T>): string => {
  const identifiers = Object.values(doc.context.identifiers);
  const imports = Object.entries(doc.context.imports);

  return [
    ...imports.map(([module, names]) =>
      printNode(Import({ named: [...names].sort().map(item => ({ name: item })), module })),
    ),
    printNode(doc.type),
    ...identifiers.map(identifier => printNode(identifier)),
  ].join('\n\n');
};
