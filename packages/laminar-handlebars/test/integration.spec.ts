import { get, post, router, Laminar, laminar, start, stop } from '@ovotech/laminar';
import axios, { AxiosResponse } from 'axios';
import { join } from 'path';
import { handlebarsMiddleware } from '../src';

let server: Laminar;

const axiosSnapshot = {
  config: expect.anything(),
  request: expect.anything(),
  headers: { date: expect.anything() },
};

const capitalizeName = (name: string): string => name.toUpperCase();

describe('Integration', () => {
  afterEach(() => stop(server));

  it('Should process response', async () => {
    const handlebars = handlebarsMiddleware({
      dir: join(__dirname, 'root'),
      helpers: { capitalizeName },
    });

    server = laminar({
      port: 8062,
      app: handlebars(
        router(
          get('/', ({ render }) => render('index')),
          post('/result', ({ render, body: { name } }) =>
            render('result', { name }, { status: 201 }),
          ),
        ),
      ),
    });
    await start(server);

    const api = axios.create({ baseURL: 'http://localhost:8062' });

    expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot);

    expect(await api.post('/result', { name: 'John Smith' })).toMatchSnapshot<AxiosResponse>(
      axiosSnapshot,
    );
  });
});
