import { htmlOk, HttpService, init } from '@ovotech/laminar';
import { join } from 'path';
import { handlebarsMiddleware, HandlebarsContext } from '@ovotech/laminar-handlebars';
import { openApiTyped } from './__generated__/api.yaml';

const main = async () => {
  const withHandlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

  const listener = await openApiTyped<HandlebarsContext>({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/test': {
        post: async ({ body, hbs }) => htmlOk(hbs('result', { name: body.email })),
        get: async ({ hbs }) => htmlOk(hbs('result', { name: 'me@example.com' })),
      },
    },
  });
  const server = new HttpService({ listener: withHandlebars(listener) });
  await init({ initOrder: [server], logger: console });
};

main();
