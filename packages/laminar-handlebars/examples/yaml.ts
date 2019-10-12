import { laminar, router, get } from '@ovotech/laminar';
import { createHandlebars, HandlebarsContext } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = createHandlebars({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

laminar({
  port: 3333,
  app: handlebars(
    router<HandlebarsContext>(
      get('/', ({ render }) => {
        return render('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } });
      }),
      get('/swagger.yaml', ({ render }) => render('swagger.yaml', { version: 10 })),
    ),
  ),
});
