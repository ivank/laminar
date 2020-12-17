import { get, post, router, httpServer, start, stop } from '@ovotech/laminar';
import axios, { AxiosResponse } from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
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

  it.each`
    cacheType
    ${'expiry'}
    ${'preload'}
    ${'none'}
  `('Should process changing handlebars tempaltes with $cacheType', async ({ cacheType }) => {
    const dir = join(__dirname, '__generated__/root');
    mkdirSync(join(dir, 'views'), { recursive: true });
    mkdirSync(join(dir, 'partials'), { recursive: true });
    writeFileSync(join(dir, 'views/index.hbs'), '{{#> layout }}<span>Generated</span>{{/layout}}');
    writeFileSync(join(dir, 'partials/layout.hbs'), '<html><body>Layout {{> @partial-block }}</body></html>');

    const handlebars = handlebarsMiddleware({ dir, extension: 'hbs', cacheType });

    const server = httpServer({
      port: 8062,
      app: handlebars(router(get('/', ({ hbs }) => hbs('index')))),
    });

    const api = axios.create({ baseURL: 'http://localhost:8062' });

    try {
      await start(server);

      expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot, 'inital');

      writeFileSync(join(dir, 'partials/layout.hbs'), '<html><body>Layout 2 {{> @partial-block }}</body></html>');
      writeFileSync(join(dir, 'views/index.hbs'), '{{#> layout }}<span>Generated 2</span>{{/layout}}');

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await api.get('/')).toMatchSnapshot<AxiosResponse>(axiosSnapshot, 'after modification');
    } finally {
      await stop(server);
    }
  });
});
