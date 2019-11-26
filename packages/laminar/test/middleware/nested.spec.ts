import axios from 'axios';
import { createLaminar, Middleware, Resolver, Context, createBodyParser } from '../../src';

interface One {
  one: string;
}
interface Two {
  two: number;
}
interface Three {
  three: boolean;
}

const bodyParser = createBodyParser();
const withOne: Middleware<One> = resolver => async ctx => resolver({ ...ctx, one: 'one' });

const withTwo: Middleware<Two, One> = resolver => ctx => resolver({ ...ctx, two: 2 });

const withThree: Middleware<Three> = resolver => async ctx => resolver({ ...ctx, three: false });

const resolver: Resolver<One & Two & Three & Context> = ctx => {
  const { one, two, three, url } = ctx;
  return { one, two, three, url: url.pathname };
};

const app = bodyParser(withOne(withTwo(withThree(resolver))));

const appWithAutoAssign = bodyParser(
  withOne(
    withTwo(
      withThree(ctx => {
        const { one, two, three, url } = ctx;
        return { one, two, three, url: url.pathname };
      }),
    ),
  ),
);

describe('Nested middleware', () => {
  it('Should propagate multiple middlewarres ', async () => {
    const server = createLaminar({ app, port: 8095 });
    await server.start();
    const api = axios.create({ baseURL: 'http://localhost:8095' });

    const result = await api.get('/test2');

    expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });

    await server.stop();
  });

  it('Should be able to pass context automatically', async () => {
    const server = createLaminar({ app: appWithAutoAssign, port: 8095 });
    await server.start();
    const api = axios.create({ baseURL: 'http://localhost:8095' });

    const result = await api.get('/test2');

    expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });

    await server.stop();
  });
});
