import { httpServer, start, describe, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = httpServer({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
