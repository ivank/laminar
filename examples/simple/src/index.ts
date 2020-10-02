import { httpServer, start, describe, jsonOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  /**
   * Since we've already generated this using the api file, the paths,
   * all of its request and response data would be properly typed
   */
  const app = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => {
          /**
           * Our types would require us to return a json response specifically,
           * otherwise it would not compile
           */
          return jsonOk(findUser(path.id));
        },
      },
    },
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   */
  const server = httpServer({ app, port: 3300 });

  /**
   * The http server now should be running
   */
  await start(server);

  /**
   * We indicate that the server is now running
   */
  console.log(describe(server));
};

main();
