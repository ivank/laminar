import { HttpListener, HttpService, init, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
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
  });
};
// listener

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
