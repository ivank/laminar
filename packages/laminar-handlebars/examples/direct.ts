import { start, router, get, post, httpServer, describe } from '@ovotech/laminar';
import { handlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const server = httpServer({
  port: 3333,
  app: router(
    get('/', () => hbs('index')),
    post('/result', ({ body: { name } }) => hbs('result', { name })),
  ),
});

start(server).then(() => console.log(describe(server)));
