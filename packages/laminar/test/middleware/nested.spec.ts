import axios from 'axios';
import { httpServer, Middleware, App, jsonOk, start, stop } from '../../src';

interface One {
  one: string;
}
interface Two {
  two: number;
}
interface Three {
  three: boolean;
}

const withOne: Middleware<One> = (next) => async (req) => next({ ...req, one: 'one' });

const withTwo: Middleware<Two, One> = (next) => (req) => next({ ...req, two: 2 });

const withThree: Middleware<Three> = (next) => async (req) => next({ ...req, three: false });

const resolver: App<One & Two & Three> = (req) => {
  const { one, two, three, url } = req;
  return jsonOk({ one, two, three, url: url.pathname });
};

const app: App = withOne(withTwo(withThree(resolver)));

const appWithAutoAssign: App = withOne(
  withTwo(
    withThree((req) => {
      const { one, two, three, url } = req;
      return jsonOk({ one, two, three, url: url.pathname });
    }),
  ),
);

describe('Nested middleware', () => {
  it('Should propagate multiple middlewarres ', async () => {
    const server = httpServer({ app, port: 8095 });
    await start(server);
    const api = axios.create({ baseURL: 'http://localhost:8095' });
    try {
      const result = await api.get('/test2');

      expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });
    } finally {
      await stop(server);
    }
  });

  it('Should be able to pass context automatically', async () => {
    const server = httpServer({ app: appWithAutoAssign, port: 8095 });
    const api = axios.create({ baseURL: 'http://localhost:8095' });
    try {
      await start(server);

      const result = await api.get('/test2');

      expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });
    } finally {
      await stop(server);
    }
  });
});
