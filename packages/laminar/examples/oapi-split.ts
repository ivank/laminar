import { HttpService, jsonOk, openApi, init } from '@laminarjs/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi-split.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: async () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
