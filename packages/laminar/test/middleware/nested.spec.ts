import axios from 'axios';
import { Server } from 'http';
import { laminar, Middleware, Resolver, Context } from '../../src';

interface One {
  one: string;
}
interface Two {
  two: number;
}
interface Three {
  three: boolean;
}

export const withOne: Middleware<One> = resolver => async ctx => resolver({ ...ctx, one: 'one' });

export const withTwo: Middleware<Two> = resolver => ctx => resolver({ ...ctx, two: 2 });

export const withThree: Middleware<Three> = resolver => async ctx =>
  resolver({ ...ctx, three: false });

export const resolver: Resolver<One & Two & Three & Context> = ctx => {
  const { one, two, three, url } = ctx;
  return { one, two, three, url: url.pathname };
};

const app = withOne(withTwo(withThree(resolver)));

const api = axios.create({ baseURL: 'http://localhost:8095' });

let server: Server;

describe('Nested middleware', () => {
  beforeAll(async () => {
    server = await laminar({ app, port: 8095 });
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('Should propagate multiple middlewarres ', async () => {
    const result = await api.get('/test2');

    expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });
  });
});
