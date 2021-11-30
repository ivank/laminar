import { HttpListener, HttpService, init, jsonOk, openApi, securityError, securityOk } from '@ovotech/laminar';
import { join } from 'path';

/**
 * A simple function to mock getting data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

// << listener
const createHttpListener = async (): Promise<HttpListener> => {
  return await openApi({
    api: join(__dirname, '../../schema/security.yaml'),
    security: {
      MySecurity: async ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : securityError({ message: 'Unauthorized user' }),
    },
    paths: {
      '/user/{id}': {
        get: async ({ path, authInfo }) => jsonOk({ user: findUser(path.id), auth: authInfo }),
      },
    },
  });
};
// listener

createHttpListener().then((listener) => init({ initOrder: [new HttpService({ listener })], logger: console }));
