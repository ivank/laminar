import { HttpService, jsonOk, router, get, redirect, openApi, init } from '@laminar/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const listener = router(
    get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
    get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    await openApi({
      api,
      paths: {
        '/user': {
          post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
          get: async () => jsonOk({ email: 'me@example.com' }),
        },
      },
    }),
  );

  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
