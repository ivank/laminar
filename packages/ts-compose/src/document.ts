import * as ts from 'typescript';
import { Node } from './node';
import { printNode } from './print';

export interface Identifiers {
  [key: string]: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.VariableStatement | ts.EnumDeclaration;
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
  identifiers?: Identifiers;
  headers?: string[];
  namespaces?: { [namespace: string]: Identifiers };
  imports?: { [key: string]: ImportNode };
}

export interface Document<TAstType = ts.TypeNode, TContext extends DocumentContext = DocumentContext> {
  type: TAstType;
  context: TContext;
}

export const document = <TAstType = ts.TypeNode, TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  type: TAstType,
): Document<TAstType, TContext> => ({
  context,
  type,
});

export const mapWithContext = <T = unknown, TAstType = ts.TypeNode, TContext extends DocumentContext = DocumentContext>(
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
  identifier: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.VariableStatement | ts.EnumDeclaration,
  namespace?: string,
): TContext => {
  const name =
    'declarationList' in identifier
      ? (identifier.declarationList.declarations[0].name as ts.Identifier).text
      : identifier.name.text;

  return namespace === undefined
    ? { ...context, identifiers: { ...context.identifiers, [name]: identifier } }
    : {
        ...context,
        namespaces: {
          ...context.namespaces,
          [namespace]: { ...context.namespaces?.[namespace], [name]: identifier },
        },
      };
};

const mergeImportNamed = (source: ImportNamed[], destin: ImportNamed[]): ImportNamed[] => [
  ...source.filter((item) => !destin.find((destinItem) => destinItem.name === item.name)),
  ...destin,
];

export const withImports = <TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  value: ImportNode,
): TContext => {
  const current = context.imports?.[value.module];

  return {
    ...context,
    imports: {
      ...context.imports,
      [value.module]: {
        ...current,
        ...value,
        named:
          value.named && current?.named ? mergeImportNamed(value.named, current.named) : value.named ?? current?.named,
      },
    },
  };
};

export const withHeader = <TContext extends DocumentContext = DocumentContext>(
  context: TContext,
  header: string,
): TContext => ({
  ...context,
  headers: [...(context.headers ?? []), header],
});

export const printDocument = <T extends ts.Node>(doc: Document<T>): string => {
  const identifiers = doc.context.identifiers ? Object.values(doc.context.identifiers) : [];
  const headers = doc.context.headers ?? [];
  const imports = doc.context.imports ? Object.values(doc.context.imports) : [];
  const namespaces = doc.context.namespaces
    ? Object.entries(doc.context.namespaces).map(([name, identifiers]) =>
        Node.NamespaceBlock({ name, isExport: true, block: Object.values(identifiers) }),
      )
    : [];

  return (
    [
      ...headers,
      ...imports.map((item) => printNode(Node.Import(item))),
      printNode(doc.type),
      ...identifiers.map((identifier) => printNode(identifier)),
      ...namespaces.map((namespace) => printNode(namespace)),
    ].join('\n\n') + '\n'
  );
};
