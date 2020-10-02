import { get, jsonOk, router, httpServer, describe, start } from '@ovotech/laminar';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const server = httpServer({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users/{id}', ({ path }) => jsonOk(findUser(path.id))),
    ),
    port: 3300,
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   */
  await start(server);

  console.log(describe(server));
};

main();
