import { init, router, get, HttpService, htmlOk } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({
  dir: join(__dirname, 'templates-html'),
  globalData: { notification: 'Account Authenticated' },
});

const server = new HttpService({
  listener: handlebars(router(get('/', async ({ hbs }) => htmlOk(hbs('index'))))),
});

init({ initOrder: [server], logger: console });
