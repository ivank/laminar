import { start, router, get, httpServer, describe } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

const server = httpServer({
  port: 3333,
  app: handlebars(
    router(
      get('/', ({ hbs }) => hbs('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } })),
      get('/swagger.yaml', ({ hbs }) => hbs('swagger.yaml', { version: 10 })),
    ),
  ),
});

start(server).then(() => console.log(describe(server)));
