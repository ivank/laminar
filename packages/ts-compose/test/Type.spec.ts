import * as ts from 'typescript';
import { printNode, Type } from '../src';

describe('TS Compose', () => {
  it.each<[string, ts.Node]>([
    ['any', Type.Any],
    ['boolean', Type.Bool],
    ['void', Type.Void],
    ['null', Type.Null],
    ['object', Type.Obj],
    ['string', Type.Str],
    ['number', Type.Num],
    ['"1234"', Type.LiteralString('1234')],
    ['"123"', Type.Literal('123')],
    ['true', Type.Literal(true)],
    ['123', Type.Literal(123)],
    ['123.23', Type.Literal(123.23)],
    ['string[]', Type.Arr(Type.Str)],
    ['[string, number]', Type.Tuple([Type.Str, Type.Num])],
    ['number[][]', Type.Arr(Type.Arr(Type.Num))],
    ['number | string', Type.Union([Type.Num, Type.Str])],
    ['number | string | string[]', Type.Union([Type.Num, Type.Str, Type.Arr(Type.Str)])],
    ['number & string', Type.Intersection([Type.Num, Type.Str])],
    ['number & string & string[]', Type.Intersection([Type.Num, Type.Str, Type.Arr(Type.Str)])],
    ['test1: number;', Type.Prop({ name: 'test1', type: Type.Num })],
    ['readonly test1: number;', Type.Prop({ name: 'test1', type: Type.Num, isReadonly: true })],
    ['test2?: string;', Type.Prop({ name: 'test2', type: Type.Str, isOptional: true })],
    ['public test: string;', Type.Prop({ name: 'test', type: Type.Str, isPublic: true })],
    ['private test: string;', Type.Prop({ name: 'test', type: Type.Str, isPrivate: true })],
    ['protected test: string;', Type.Prop({ name: 'test', type: Type.Str, isProtected: true })],
    [
      `{\n    test1?: string;\n    test2: number;\n}`,
      Type.TypeLiteral({
        props: [
          Type.Prop({ name: 'test1', type: Type.Str, isOptional: true }),
          Type.Prop({ name: 'test2', type: Type.Num }),
        ],
      }),
    ],
    [
      `{\n    test1?: string;\n    test2: number;\n    readonly [key: string]: number;\n}`,
      Type.TypeLiteral({
        props: [
          Type.Prop({ name: 'test1', type: Type.Str, isOptional: true }),
          Type.Prop({ name: 'test2', type: Type.Num }),
        ],
        index: Type.Index({ name: 'key', nameType: Type.Str, type: Type.Num, isReadonly: true }),
      }),
    ],
    [
      `{\n    test1: string;\n    [index: number]: any;\n}`,
      Type.TypeLiteral({
        props: [Type.Prop({ name: 'test1', type: Type.Str })],
        index: Type.Index({ name: 'index', nameType: Type.Num, type: Type.Any }),
      }),
    ],
    ['type mytype = string;', Type.Alias({ name: 'mytype', type: Type.Str })],
    [
      'export type mytype = string;',
      Type.Alias({ name: 'mytype', type: Type.Str, isExport: true }),
    ],
    [
      'type mytype<Best = any> = number;',
      Type.Alias({
        name: 'mytype',
        type: Type.Num,
        typeArgs: [Type.TypeArg({ name: 'Best', defaultType: Type.Any })],
      }),
    ],
    [
      'interface test {\n    name: string;\n}',
      Type.Interface({ name: 'test', props: [Type.Prop({ name: 'name', type: Type.Str })] }),
    ],
    [
      'export interface MyTest extends OtherTest {\n    name: string;\n}',
      Type.Interface({
        name: 'MyTest',
        isExport: true,
        ext: [{ name: 'OtherTest' }],
        props: [Type.Prop({ name: 'name', type: Type.Str })],
      }),
    ],
    [
      'interface MyTest<T = any> extends OtherTest<T> {\n    name: string;\n    stuff?: number;\n}',
      Type.Interface({
        name: 'MyTest',
        typeArgs: [Type.TypeArg({ name: 'T', defaultType: Type.Any })],
        ext: [{ name: 'OtherTest', types: [Type.TypeExpression({ name: 'T' })] }],
        props: [
          Type.Prop({ name: 'name', type: Type.Str }),
          Type.Prop({ name: 'stuff', type: Type.Num, isOptional: true }),
        ],
      }),
    ],
  ])('Test print of %s', async (typescript, node) => {
    expect(printNode(node)).toEqual(typescript);
  });
});
