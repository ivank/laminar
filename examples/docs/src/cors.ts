import { httpServer, start, describe, jsonOk, openApi, corsMiddleware } from '@ovotech/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const app = await openApi({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });

  /**
   * Define cors with all of its options
   */
  const cors = corsMiddleware({ allowOrigin: ['http://localhost', 'http://example.com'] });

  /**
   * Apply cors
   */
  const server = httpServer({ app: cors(app), port: 3300 });
  await start(server);
  console.log(describe(server));
};

main();
