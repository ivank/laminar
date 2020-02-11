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
    ['const a;', Node.Const({ name: 'a' })],
    ['const s = "10";', Node.Const({ name: 's', value: '10' })],
    ['const b = true;', Node.Const({ name: 'b', value: true })],
    ['const n = null;', Node.Const({ name: 'n', value: null })],
    ['const i = 123;', Node.Const({ name: 'i', value: 123 })],
    ['const o = { test: 10 };', Node.Const({ name: 'o', value: { test: 10 } })],
    [
      'const o2 = {\n    test: 10\n};',
      Node.Const({ name: 'o2', value: { test: 10 }, multiline: true }),
    ],
    [
      'const o3 = { test: 10, other: { m: { t: true }, k: "123" } };',
      Node.Const({ name: 'o3', value: { test: 10, other: { m: { t: true }, k: '123' } } }),
    ],
    ['export const b = false;', Node.Const({ name: 'b', isExport: true, value: false })],
    [
      'export default const b = true;',
      Node.Const({ name: 'b', isExport: true, isDefault: true, value: true }),
    ],
  ])('Test print of %s', async (typescript, result) => {
    expect(printNode(result)).toEqual(typescript);
  });
});
