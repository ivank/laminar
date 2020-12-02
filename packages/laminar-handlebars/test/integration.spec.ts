import { get, post, router, httpServer, start, stop } from '@ovotech/laminar';
import axios, { AxiosResponse } from 'axios';
import { join } from 'path';
import { handlebarsMiddleware } from '../src';

const axiosSnapshot = {
  config: expect.anything(),
  request: expect.anything(),
  headers: { date: expect.anything() },
};

const capitalizeName = (name: string): string => name.toUpperCase();

describe('Integration', () => {
  it('Should process response', async () => {
    const handlebars = handlebarsMiddleware({
      dir: join(__dirname, 'root'),
      helpers: { capitalizeName },
    });

    const server = httpServer({
      port: 8062,
      app: handlebars(
        router(
          get('/', ({ hbs }) => hbs('index')),
          post('/result', ({ hbs, body: { name } }) => hbs('result', { name }, { status: 201 })),
        ),
      ),
    });

    const api = axios.create({ baseURL: 'http://localhost:8062' });

    try {
      await start(server);

      expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot);
      expect(await api.post('/result', { name: 'John Smith' })).toMatchSnapshot<AxiosResponse>(axiosSnapshot);
    } finally {
      await stop(server);
    }
  });
});
