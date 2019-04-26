import * as ts from 'typescript';

export const Identifier = (name: string | ts.Identifier) =>
  typeof name === 'string' ? ts.createIdentifier(name) : name;

export const Import = ({
  named,
  allAs,
  defaultAs,
  module,
}: {
  named?: Array<{ name: string | ts.Identifier; as?: string }>;
  defaultAs?: string | ts.Identifier;
  allAs?: string;
  module: string;
}) =>
  ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      defaultAs ? Identifier(defaultAs) : undefined,
      named
        ? ts.createNamedImports(
            named.map(item =>
              ts.createImportSpecifier(
                item.as ? Identifier(item.name) : undefined,
                item.as ? Identifier(item.as) : Identifier(item.name),
              ),
            ),
          )
        : allAs
        ? ts.createNamespaceImport(Identifier(allAs))
        : undefined,
    ),
    ts.createStringLiteral(module),
  );
