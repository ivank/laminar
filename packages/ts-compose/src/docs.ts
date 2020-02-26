import * as ts from 'typescript';

const jsDoc = (doc: string): string =>
  `*\n${doc
    .split('\n')
    .map(line => ` * ${line}`)
    .join('\n')}\n `;

export const addJSDoc = <T extends ts.Node>(node: T, doc: string): T =>
  ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, jsDoc(doc), true);

export const withJSDoc = <T extends ts.Node>(doc: string | undefined, node: T): T =>
  doc === undefined ? node : addJSDoc(node, doc);
