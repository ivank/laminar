import { laminar, start, describe, jsonOk } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';
import { Config } from './oapi.yaml';

const main = async () => {
  const config: Config = {
    api: join(__dirname, 'oapi.yaml'),
    paths: {
      '/test': {
        post: ({ body }) => jsonOk({ text: 'ok', user: body }),
        get: () => jsonOk({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  };
  const app = await createOapi(config);
  const server = laminar({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
