import { init, router, get, post, HttpService, htmlOk } from '@laminarjs/laminar';
import { handlebarsMiddleware } from '@laminarjs/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html'), cacheType: 'expiry' });

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => htmlOk(hbs('index'))),
      post('/result', async ({ hbs, body: { name } }) => htmlOk(hbs('result', { name }))),
    ),
  ),
});

init({ initOrder: [http], logger: console });
