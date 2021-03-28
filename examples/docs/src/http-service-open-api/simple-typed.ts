import { HttpListener, HttpService, init, jsonOk } from '@ovotech/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

// << listener
import { openApiTyped } from './__generated__/api.yaml';

const createHttpListener = async (): Promise<HttpListener> => {
  return await openApiTyped({
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
