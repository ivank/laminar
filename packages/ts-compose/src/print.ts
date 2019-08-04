import * as ts from 'typescript';

export const printNode = (node: ts.Node): string =>
  ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printNode(
      ts.EmitHint.Unspecified,
      node,
      ts.createSourceFile('file.ts', '', ts.ScriptTarget.Latest),
    );
