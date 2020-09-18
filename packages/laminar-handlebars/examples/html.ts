import { start, router, get, post, laminar, describe } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

const server = laminar({
  port: 3333,
  app: handlebars(
    router(
      get('/', ({ render }) => render('index')),
      post('/result', ({ render, body: { name } }) => render('result', { name })),
    ),
  ),
});

start(server).then(() => console.log(describe(server)));
