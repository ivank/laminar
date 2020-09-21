import { laminar, describe, jsonOk, start, jsonUnauthorized } from '@ovotech/laminar';
import { createOapi, securityOk } from '@ovotech/laminar-oapi';
import { join } from 'path';

const api = join(__dirname, 'simple.yaml');

const main = async () => {
  const app = await createOapi({
    api,
    security: {
      MySecurity: ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : jsonUnauthorized({ message: 'Unauthorized user' }),
    },
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
