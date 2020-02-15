import * as ts from 'typescript';
import { Import } from './node';
import { printNode } from './print';

export interface Identifiers {
  [key: string]:
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.VariableStatement
    | ts.EnumDeclaration;
}

export interface ImportNamed {
  name: string | ts.Identifier;
  as?: string;
}

export interface ImportNode {
  module: string;
  named?: ImportNamed[];
  defaultAs?: string | ts.Identifier;
  allAs?: string;
}

export interface DocumentContext {
  identifiers: Identifiers;
  imports: { [key: string]: ImportNode };
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
  identifier:
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.VariableStatement
    | ts.EnumDeclaration,
): TContext => ({
  ...context,
  identifiers: {
    ...context.identifiers,
    ['declarationList' in identifier
      ? (identifier.declarationList.declarations[0].name as ts.Identifier).text
      : identifier.name.text]: identifier,
  },
});

const mergeImportNamed = (source: ImportNamed[], destin: ImportNamed[]): ImportNamed[] => [
  ...source.filter(item => !destin.find(destinItem => destinItem.name === item.name)),
  ...destin,
];

export const withImports = <TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  value: ImportNode,
): TContext => {
  const current = context.imports[value.module];

  return {
    ...context,
    imports: {
      ...context.imports,
      [value.module]: {
        ...current,
        ...value,
        named:
          value.named && current?.named
            ? mergeImportNamed(value.named, current.named)
            : value.named ?? current?.named,
      },
    },
  };
};

export const printDocument = <T extends ts.Node>(doc: Document<T>): string => {
  const identifiers = Object.values(doc.context.identifiers);
  const imports = Object.values(doc.context.imports);

  return (
    [
      ...imports.map(item => printNode(Import(item))),
      printNode(doc.type),
      ...identifiers.map(identifier => printNode(identifier)),
    ].join('\n\n') + '\n'
  );
};
