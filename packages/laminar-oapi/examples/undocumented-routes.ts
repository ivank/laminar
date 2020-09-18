import { laminar, start, describe, jsonOk, router, get, redirect } from '@ovotech/laminar';
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

  const server = laminar({
    port: 3333,
    app: router(
      get('/old/{id}', ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
      app,
    ),
  });
  await start(server);
  console.log(describe(server));
};

main();
