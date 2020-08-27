import * as ts from 'typescript';
import { printNode, Type } from '../src';

describe('TS Compose', () => {
  it.each<[string, ts.Node]>([
    ['any', Type.Any],
    ['unknown', Type.Unknown],
    ['undefined', Type.Undefined],
    ['boolean', Type.Boolean],
    ['void', Type.Void],
    ['null', Type.Null],
    ['never', Type.Never],
    ['object', Type.Object],
    ['string', Type.String],
    ['number', Type.Number],
    ['"1234"', Type.LiteralString('1234')],
    ['"123"', Type.Literal('123')],
    ['true', Type.Literal(true)],
    ['123', Type.Literal(123)],
    ['123.23', Type.Literal(123.23)],
    ['string[]', Type.Array(Type.String)],
    ['[\n    string,\n    number\n]', Type.Tuple([Type.String, Type.Number])],
    ['number[][]', Type.Array(Type.Array(Type.Number))],
    ['Test', Type.Referance('Test')],
    ['Test.Other', Type.Referance(['Test', 'Other'])],
    ['Test.Other.Still', Type.Referance(['Test', 'Other', 'Still'])],
    ['Test<Other>', Type.Referance('Test', [Type.Referance('Other')])],
    [
      'Test<Other, Other2>',
      Type.Referance('Test', [Type.Referance('Other'), Type.Referance('Other2')]),
    ],
    ['Test.Other<Me>', Type.Referance(['Test', 'Other'], [Type.Referance('Me')])],
    ['number | string', Type.Union([Type.Number, Type.String])],
    ['null | false', Type.Union([Type.Null, Type.Literal(false)])],
    ['number | string | string[]', Type.Union([Type.Number, Type.String, Type.Array(Type.String)])],
    ['number & string', Type.Intersection([Type.Number, Type.String])],
    [
      'number & string & string[]',
      Type.Intersection([Type.Number, Type.String, Type.Array(Type.String)]),
    ],
    ['test1: number;', Type.Prop({ name: 'test1', type: Type.Number })],
    ['readonly test1: number;', Type.Prop({ name: 'test1', type: Type.Number, isReadonly: true })],
    ['test2?: string;', Type.Prop({ name: 'test2', type: Type.String, isOptional: true })],
    ['public test: string;', Type.Prop({ name: 'test', type: Type.String, isPublic: true })],
    ['private test: string;', Type.Prop({ name: 'test', type: Type.String, isPrivate: true })],
    ['protected test: string;', Type.Prop({ name: 'test', type: Type.String, isProtected: true })],
    [
      `{\n    test1?: string;\n    test2: number;\n}`,
      Type.TypeLiteral({
        props: [
          Type.Prop({ name: 'test1', type: Type.String, isOptional: true }),
          Type.Prop({ name: 'test2', type: Type.Number }),
        ],
      }),
    ],
    [
      `{\n    test1?: string;\n    test2: number;\n    readonly [key: string]: number;\n}`,
      Type.TypeLiteral({
        props: [
          Type.Prop({ name: 'test1', type: Type.String, isOptional: true }),
          Type.Prop({ name: 'test2', type: Type.Number }),
        ],
        index: Type.Index({
          name: 'key',
          nameType: Type.String,
          type: Type.Number,
          isReadonly: true,
        }),
      }),
    ],
    [
      `{\n    test1: string;\n    [index: number]: any;\n}`,
      Type.TypeLiteral({
        props: [Type.Prop({ name: 'test1', type: Type.String })],
        index: Type.Index({ name: 'index', nameType: Type.Number, type: Type.Any }),
      }),
    ],
    ['type mytype = string;', Type.Alias({ name: 'mytype', type: Type.String })],
    [
      'export type mytype = string;',
      Type.Alias({ name: 'mytype', type: Type.String, isExport: true }),
    ],
    [
      'export default type mytype = string;',
      Type.Alias({ name: 'mytype', type: Type.String, isExport: true, isDefault: true }),
    ],
    [
      'type mytype<Best = any> = number;',
      Type.Alias({
        name: 'mytype',
        type: Type.Number,
        typeArgs: [Type.TypeArg({ name: 'Best', defaultType: Type.Any })],
      }),
    ],
    [
      'type mytype<Best extends Parent<string> = any> = number;',
      Type.Alias({
        name: 'mytype',
        type: Type.Number,
        typeArgs: [
          Type.TypeArg({
            name: 'Best',
            ext: Type.Referance('Parent', [Type.String]),
            defaultType: Type.Any,
          }),
        ],
      }),
    ],
    [
      'interface test {\n    name: string;\n}',
      Type.Interface({ name: 'test', props: [Type.Prop({ name: 'name', type: Type.String })] }),
    ],
    [
      'interface test {\n    name: namespace1.MyTpe;\n}',
      Type.Interface({
        name: 'test',
        props: [Type.Prop({ name: 'name', type: Type.Referance('namespace1.MyTpe') })],
      }),
    ],
    [
      'interface test {\n    get(T1: number);\n    get<T2>(T3?: string): any;\n}',
      Type.Interface({
        name: 'test',
        props: [
          Type.Method({
            name: 'get',
            params: [Type.Param({ name: 'T1', type: Type.Number })],
          }),
          Type.Method({
            name: 'get',
            typeArgs: [Type.TypeArg({ name: 'T2' })],
            params: [Type.Param({ name: 'T3', type: Type.String, isOptional: true })],
            type: Type.Any,
          }),
        ],
      }),
    ],
    [
      'interface test {\n    "11231": string;\n}',
      Type.Interface({ name: 'test', props: [Type.Prop({ name: '11231', type: Type.String })] }),
    ],
    [
      'interface test {\n    a11231: string;\n}',
      Type.Interface({ name: 'test', props: [Type.Prop({ name: 'a11231', type: Type.String })] }),
    ],
    [
      'interface test {\n    "_.xgafv": string;\n}',
      Type.Interface({ name: 'test', props: [Type.Prop({ name: '_.xgafv', type: Type.String })] }),
    ],
    [
      'export interface LaminarPaths<TContext extends Context | RouteContext> {\n}',
      Type.Interface({
        name: 'LaminarPaths',
        isExport: true,
        typeArgs: [
          Type.TypeArg({
            name: 'TContext',
            ext: Type.Union([Type.Referance('Context'), Type.Referance('RouteContext')]),
          }),
        ],
      }),
    ],
    [
      'export default interface test {\n    name: string;\n}',
      Type.Interface({
        name: 'test',
        isExport: true,
        isDefault: true,
        props: [Type.Prop({ name: 'name', type: Type.String })],
      }),
    ],
    ['interface test {\n}', Type.Interface({ name: 'test' })],
    [
      'export interface MyTest extends OtherTest {\n    name: string;\n}',
      Type.Interface({
        name: 'MyTest',
        isExport: true,
        ext: [{ name: 'OtherTest' }],
        props: [Type.Prop({ name: 'name', type: Type.String })],
      }),
    ],
    [
      'interface MyTest<T = any> extends OtherTest<T> {\n    name: string;\n    stuff?: number;\n}',
      Type.Interface({
        name: 'MyTest',
        typeArgs: [Type.TypeArg({ name: 'T', defaultType: Type.Any })],
        ext: [{ name: 'OtherTest', types: [Type.TypeExpression({ name: 'T' })] }],
        props: [
          Type.Prop({ name: 'name', type: Type.String }),
          Type.Prop({ name: 'stuff', type: Type.Number, isOptional: true }),
        ],
      }),
    ],
  ])('Test print of %s', async (typescript, node) => {
    expect(printNode(node)).toEqual(typescript);
  });
});
