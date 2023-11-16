import { init, router, get, post, HttpService, htmlOk } from '@laminar/laminar';
import { handlebars } from '@laminar/handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const http = new HttpService({
  listener: router(
    get('/', async () => htmlOk(hbs('index'))),
    post('/result', async ({ body: { name } }) => htmlOk(hbs('result', { name }))),
  ),
});

init({ initOrder: [http], logger: console });
