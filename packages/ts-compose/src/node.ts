import * as ts from 'typescript';
import { withJSDoc } from './docs';
import { Export } from './type';

export const Identifier = (name: string | ts.Identifier): ts.Identifier =>
  typeof name === 'string' ? ts.createIdentifier(name) : name;

export const Import = ({
  named,
  allAs,
  defaultAs,
  module,
}: {
  named?: { name: string | ts.Identifier; as?: string }[];
  defaultAs?: string | ts.Identifier;
  allAs?: string;
  module: string;
}): ts.ImportDeclaration =>
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

export const NamespaceBlock = ({
  name,
  block,
  isExport,
  isDefault,
  jsDoc,
}: {
  name: string;
  block: ts.Statement[];
  isExport?: boolean;
  isDefault?: boolean;
  jsDoc?: string;
}): ts.ModuleDeclaration =>
  withJSDoc(
    ts.createModuleDeclaration(
      [],
      Export(isExport, isDefault),
      ts.createIdentifier(name),
      ts.createModuleBlock(block),
      ts.NodeFlags.Namespace,
    ),
    jsDoc,
  );

export const Const = ({
  name,
  type,
  value,
  isExport,
  isDefault,
  jsDoc,
}: {
  name: string | ts.Identifier;
  type?: ts.TypeNode;
  value?: string | number | boolean;
  isExport?: boolean;
  isDefault?: boolean;
  jsDoc?: string;
}): ts.VariableStatement =>
  withJSDoc(
    ts.createVariableStatement(
      Export(isExport, isDefault),
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            name,
            type,
            value === undefined ? undefined : ts.createLiteral(value),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    jsDoc,
  );
