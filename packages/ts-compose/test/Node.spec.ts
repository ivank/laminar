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
        named: [{ name: 'AxiosInstance', as: 'one' }, { name: 'AxiosRequestConfig', as: 'two' }],
        module: 'axios',
      }),
    ],
  ])('Test print of %s', async (typescript, result) => {
    expect(printNode(result)).toEqual(typescript);
  });
});
