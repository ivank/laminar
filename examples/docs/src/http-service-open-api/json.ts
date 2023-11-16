import { HttpListener, HttpService, init, jsonOk, openApi } from '@laminar/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    // << api
    api: join(__dirname, '../../schema/api.json'),
    // api
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
};

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
