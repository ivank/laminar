import { HttpService, init, jsonOk } from '@laminar/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api.yaml';

const main = async () => {
  const listener = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/test': {
        post: async ({ body }) => jsonOk({ text: 'ok', user: body }),
        get: async () => jsonOk({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  });
  const server = new HttpService({ listener });
  await init({ initOrder: [server], logger: console });
};

main();
