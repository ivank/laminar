import { get, laminar, post, router } from '@ovotech/laminar';
import axios, { AxiosResponse } from 'axios';
import { Server } from 'http';
import { join } from 'path';
import { HandlebarsContext, withHandlebars } from '../src';

let server: Server;

const axiosSnapshot = {
  config: expect.anything(),
  request: expect.anything(),
  headers: { date: expect.anything() },
};

const capitalizeName = (name: string): string => name.toUpperCase();

describe('Integration', () => {
  afterEach(() => new Promise(resolve => server.close(resolve)));

  it('Should process response', async () => {
    const hbs = withHandlebars({ rootDir: join(__dirname, 'root'), helpers: { capitalizeName } });

    server = await laminar({
      port: 8092,
      app: hbs(
        router<HandlebarsContext>(
          get('/', ({ render }) => render('index')),
          post('/result', ({ render, body: { name } }) =>
            render('result', { name }, { status: 201 }),
          ),
        ),
      ),
    });

    const api = axios.create({ baseURL: 'http://localhost:8092' });

    expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot);

    expect(await api.post('/result', { name: 'John Smith' })).toMatchSnapshot<AxiosResponse>(
      axiosSnapshot,
    );
  });
});
