import { HttpService, jsonOk, router, get, redirect, openApi, init, HttpListener } from '@laminarjs/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

// << listener
const createHttpListener = async (): Promise<HttpListener> =>
  router(
    get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
    get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    await openApi({
      api: join(__dirname, '../../schema/api.yaml'),
      paths: {
        '/user/{id}': {
          get: async ({ path }) => jsonOk(findUser(path.id)),
        },
      },
    }),
  );
// listener

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
