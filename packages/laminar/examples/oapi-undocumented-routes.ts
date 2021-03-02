import { httpServer, start, describe, jsonOk, router, get, redirect, openApi } from '@ovotech/laminar';
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
    notFound: router(
      get('/old/{id}', ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    ),
  });

  const server = httpServer({
    app,
  });
  await start(server);
  console.log(describe(server));
};

main();
