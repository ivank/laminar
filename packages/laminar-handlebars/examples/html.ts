import { laminar, router, get, post } from '@ovotech/laminar';
import { createHandlebars, HandlebarsContext } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = createHandlebars({ dir: join(__dirname, 'templates-html') });

laminar({
  port: 3333,
  app: handlebars(
    router<HandlebarsContext>(
      get('/', ({ render }) => render('index')),
      post('/result', ({ render, body: { name } }) => render('result', { name })),
    ),
  ),
});
