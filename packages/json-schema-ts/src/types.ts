import { RefMap } from '@ovotech/json-refs';
import { Schema } from '@ovotech/json-schema';
import * as ts from 'typescript';

export interface Registry {
  [key: string]: ts.TypeAliasDeclaration | ts.InterfaceDeclaration;
}

export interface AstContext {
  root: Schema;
  registry: Registry;
  refs: RefMap;
}

export interface AstNode<TNode = ts.TypeNode> {
  type: TNode;
  context: AstContext;
}

export type AstConvert<TNode = ts.TypeNode> = (
  schema: Schema,
  context: AstContext,
) => AstNode<TNode> | null;
