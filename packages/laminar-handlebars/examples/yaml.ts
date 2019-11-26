import { createLaminar, router, get, createBodyParser } from '@ovotech/laminar';
import { createHandlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const bodyParser = createBodyParser();

const handlebars = createHandlebars({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

createLaminar({
  port: 3333,
  app: bodyParser(
    handlebars(
      router(
        get('/', ({ render }) => {
          return render('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } });
        }),
        get('/swagger.yaml', ({ render }) => render('swagger.yaml', { version: 10 })),
      ),
    ),
  ),
}).start();
