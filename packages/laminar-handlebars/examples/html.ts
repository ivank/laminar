import { createLaminar, router, get, post, createBodyParser } from '@ovotech/laminar';
import { createHandlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const bodyParser = createBodyParser();
const handlebars = createHandlebars({ dir: join(__dirname, 'templates-html') });

createLaminar({
  port: 3333,
  app: bodyParser(
    handlebars(
      router(
        get('/', ({ render }) => render('index')),
        post('/result', ({ render, body: { name } }) => render('result', { name })),
      ),
    ),
  ),
}).start();
