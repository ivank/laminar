import { resolveRefs } from '@ovotech/json-refs';
import { Schema } from '@ovotech/json-schema';
import * as ts from 'typescript';
import { convertSchema } from './convert';
import { AstContext, AstNode } from './types';

export { convertSchema } from './convert';

export const printAstNode = (node: AstNode): string => {
  const resultFile = ts.createSourceFile('someFileName.ts', '', ts.ScriptTarget.Latest);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const entries = Object.values(node.context.registry);
  const fullSourceFile = ts.updateSourceFileNode(resultFile, entries);

  return [
    printer.printNode(ts.EmitHint.Unspecified, node.type, fullSourceFile),
    ...entries.map(entry => printer.printNode(ts.EmitHint.Unspecified, entry, fullSourceFile)),
  ].join('\n\n');
};

export const convert = async (original: Schema) => {
  const { schema, refs } = await resolveRefs(original);
  const context: AstContext = { root: schema, refs, registry: {} };
  const astNode = convertSchema(schema, context);

  return printAstNode(astNode);
};
