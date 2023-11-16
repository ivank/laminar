import { init, router, get, post, HttpService, htmlOk } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

const server = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => htmlOk(hbs('index'))),
      post('/result', async ({ hbs, body: { name } }) => htmlOk(hbs('result', { name }))),
    ),
  ),
});

init({ initOrder: [server], logger: console });
