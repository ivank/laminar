import * as ts from 'typescript';
import { Node, printNode } from '../src';

describe('TS Compose', () => {
  it.each<[string, ts.Node]>([
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
    ['namespace a { }', Node.NamespaceBlock({ name: 'a', block: [] })],
    [
      'export default namespace a { }',
      Node.NamespaceBlock({ isExport: true, isDefault: true, name: 'a', block: [] }),
    ],
    [
      'export namespace test {\n    const a = 10;\n    const b = true;\n}',
      Node.NamespaceBlock({
        name: 'test',
        isExport: true,
        block: [Node.Const({ name: 'a', value: 10 }), Node.Const({ name: 'b', value: true })],
      }),
    ],
    ['const a;', Node.Const({ name: 'a' })],
    ['const s = "10";', Node.Const({ name: 's', value: '10' })],
    ['const b = true;', Node.Const({ name: 'b', value: true })],
    ['const i = 123;', Node.Const({ name: 'i', value: 123 })],
    ['export const b = false;', Node.Const({ name: 'b', isExport: true, value: false })],
    [
      'export default const b = true;',
      Node.Const({ name: 'b', isExport: true, isDefault: true, value: true }),
    ],
  ])('Test print of %s', async (typescript, result) => {
    expect(printNode(result)).toEqual(typescript);
  });
});
