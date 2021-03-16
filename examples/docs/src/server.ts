import { get, jsonOk, router, HttpService, init } from '@ovotech/laminar';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const http = new HttpService({
    listener: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users/{id}', async ({ path }) => jsonOk(findUser(path.id))),
    ),
    port: 4399,
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   */
  await init({ services: [http], logger: console });
};

main();
