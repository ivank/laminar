import { HttpService, jsonOk, router, get, redirect, openApi, init, HttpListener } from '@ovotech/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

// << listener
const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api: join(__dirname, '../../schema/api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
    notFound: router(
      get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    ),
  });
};
// listener

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
