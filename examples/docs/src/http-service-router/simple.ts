import { get, jsonOk, router, HttpService, HttpListener, init } from '@laminarjs/laminar';

// << simple
/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const listener: HttpListener = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  get('/users/{id}', async ({ path }) => jsonOk(findUser(path.id))),
);
// simple

init({ initOrder: [new HttpService({ listener })], logger: console });
