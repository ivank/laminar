import { laminar, start, describe, jsonOk } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const api = join(__dirname, 'simple.yaml');

const main = async () => {
  const app = await createOapi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = laminar({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
