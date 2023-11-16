import { init, router, get, HttpService, yamlOk, yamlBadRequest } from '@laminar/laminar';
import { handlebarsMiddleware } from '@laminar/handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-yaml'), views: 'yaml', extension: 'hbr' });

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => yamlBadRequest(hbs('index.yaml'), { 'X-Index': 'true' })),
      get('/swagger.yaml', async ({ hbs }) => yamlOk(hbs('swagger.yaml', { version: 10 }))),
    ),
  ),
});

init({ initOrder: [http], logger: console });
