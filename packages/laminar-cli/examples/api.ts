import { httpServer, start, describe, jsonOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api.yaml';

const main = async () => {
  const app = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/test': {
        post: ({ body }) => jsonOk({ text: 'ok', user: body }),
        get: () => jsonOk({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  });
  const server = httpServer({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
