import ts from 'typescript';
import { Node, printNode, Type } from '../src';

describe('TS Compose', () => {
  it.each<[string, ts.Node]>([
    ['my_Name', Node.Identifier('my_Name')],
    [
      'create(axiosConfig)',
      Node.Call({ expression: Node.Identifier('create'), args: [Node.Identifier('axiosConfig')] }),
    ],
    ['import Axios from "axios";', Node.Import({ defaultAs: 'Axios', module: 'axios' })],
    ['import * as axios from "axios";', Node.Import({ allAs: 'axios', module: 'axios' })],
    [
      'import { AxiosInstance, AxiosRequestConfig } from "axios";',
      Node.Import({
        named: [{ name: 'AxiosInstance' }, { name: 'AxiosRequestConfig' }],
        module: 'axios',
      }),
    ],
    [
      'import Axios, { AxiosInstance as one, AxiosRequestConfig as two } from "axios";',
      Node.Import({
        defaultAs: 'Axios',
        named: [
          { name: 'AxiosInstance', as: 'one' },
          { name: 'AxiosRequestConfig', as: 'two' },
        ],
        module: 'axios',
      }),
    ],
    ['enum a {\n}', Node.Enum({ name: 'a', members: [] })],
    [
      'export enum b {\n    Big,\n    Small\n}',
      Node.Enum({
        name: 'b',
        isExport: true,
        members: [Node.EnumMember({ name: 'Big' }), Node.EnumMember({ name: 'Small' })],
      }),
    ],
    [
      'export default enum b {\n    Big = 1,\n    Small = "10"\n}',
      Node.Enum({
        name: 'b',
        isExport: true,
        isDefault: true,
        members: [Node.EnumMember({ name: 'Big', value: 1 }), Node.EnumMember({ name: 'Small', value: '10' })],
      }),
    ],
    ['namespace a { }', Node.NamespaceBlock({ name: 'a', block: [] })],
    ['export default namespace a { }', Node.NamespaceBlock({ isExport: true, isDefault: true, name: 'a', block: [] })],
    [
      'export namespace test {\n    const a = 10;\n    const b = true;\n}',
      Node.NamespaceBlock({
        name: 'test',
        isExport: true,
        block: [Node.Const({ name: 'a', value: 10 }), Node.Const({ name: 'b', value: true })],
      }),
    ],
    ['"test"', Node.Literal({ value: 'test' })],
    ['true', Node.Literal({ value: true })],
    ['10', Node.Literal({ value: 10 })],
    ['{ key: "test" }', Node.Literal({ value: { key: 'test' } })],
    ['const a;', Node.Const({ name: 'a' })],
    ['const s = "10";', Node.Const({ name: 's', value: '10' })],
    ['const b = true;', Node.Const({ name: 'b', value: true })],
    ['const n = null;', Node.Const({ name: 'n', value: null })],
    ['const i = 123;', Node.Const({ name: 'i', value: 123 })],
    ['const o = { test: 10 };', Node.Const({ name: 'o', value: { test: 10 } })],
    ['const o = { "BIG NAME": 10 };', Node.Const({ name: 'o', value: { 'BIG NAME': 10 } })],
    ['const o2 = {\n    test: 10\n};', Node.Const({ name: 'o2', value: { test: 10 }, multiline: true })],
    [
      'const o3 = { test: 10, other: { m: { t: true }, k: "123" } };',
      Node.Const({ name: 'o3', value: { test: 10, other: { m: { t: true }, k: '123' } } }),
    ],
    ['export const b = false;', Node.Const({ name: 'b', isExport: true, value: false })],
    ['export default const b = true;', Node.Const({ name: 'b', isExport: true, isDefault: true, value: true })],
    [
      'this.other<Test>(10, { test: "10" }, someVar)',
      Node.Call({
        expression: Node.Identifier('this.other'),
        typeArgs: [Type.Referance('Test')],
        args: [Node.Literal({ value: 10 }), Node.Literal({ value: { test: '10' } }), Node.Identifier('someVar')],
      }),
    ],
    ['`test${var}`', Node.TemplateString('test${var}')],
    [
      `/**
 * test
 */
{
    /**
     * number
     */
    test: 10,
    /**
     * string
     */
    "test other": "123"
}`,
      Node.ObjectLiteral({
        jsDoc: 'test',
        multiline: true,
        props: [
          Node.ObjectLiteralProp({ key: 'test', value: 10, jsDoc: 'number' }),
          Node.ObjectLiteralProp({
            key: 'test other',
            value: '123',
            jsDoc: 'string',
          }),
        ],
      }),
    ],
    ['() => "something"', Node.Arrow({ args: [], body: Node.Literal({ value: 'something' }) })],
    ['async () => "something"', Node.Arrow({ isAsync: true, args: [], body: Node.Literal({ value: 'something' }) })],
    ['one = 5', Node.Assignment(Node.Identifier('one'), Node.Literal({ value: 5 }))],
    ['await one()', Node.Await(Node.Call({ expression: Node.Identifier('one') }))],
    [
      '{\n    one();\n    two();\n}',
      Node.Block({
        statements: [
          Node.ExpressionStatement(Node.Call({ expression: Node.Identifier('one'), args: [] })),
          Node.ExpressionStatement(Node.Call({ expression: Node.Identifier('two'), args: [] })),
        ],
      }),
    ],
    ['return one();', Node.Return(Node.Call({ expression: Node.Identifier('one'), args: [] }))],
    [
      '(a: number) => { return otherFunction(a); }',
      Node.Arrow({
        args: [Type.Param({ name: 'a', type: Type.Number })],
        body: Node.Block({
          statements: [
            Node.Return(Node.Call({ expression: Node.Identifier('otherFunction'), args: [Node.Identifier('a')] })),
          ],
        }),
      }),
    ],
    [
      `export const myApi = (axiosConfig: AxiosConfig) => {
    const api = create(axiosConfig);
    return {
        getObject: <TData>(data: TData, config?: AxiosConfig) => api.get(data, config)
    };
};`,

      Node.Const({
        name: 'myApi',
        isExport: true,
        value: Node.Arrow({
          args: [Type.Param({ name: 'axiosConfig', type: Type.Referance('AxiosConfig') })],
          body: Node.Block({
            statements: [
              Node.Const({
                name: 'api',
                value: Node.Call({
                  expression: Node.Identifier('create'),
                  args: [Node.Identifier('axiosConfig')],
                }),
              }),
              Node.Return(
                Node.Literal({
                  multiline: true,
                  value: {
                    getObject: Node.Arrow({
                      typeArgs: [Type.TypeArg({ name: 'TData' })],
                      args: [
                        Type.Param({ name: 'data', type: Type.Referance('TData') }),
                        Type.Param({
                          name: 'config',
                          isOptional: true,
                          type: Type.Referance('AxiosConfig'),
                        }),
                      ],
                      body: Node.Call({
                        expression: Node.Identifier('api.get'),
                        args: [Node.Identifier('data'), Node.Identifier('config')],
                      }),
                    }),
                  },
                }),
              ),
            ],
            multiline: true,
          }),
        }),
      }),
    ],
  ])('Test print of %s', async (typescript, result) => {
    expect(printNode(result)).toEqual(typescript);
  });
});
