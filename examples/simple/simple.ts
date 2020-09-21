import { laminar, start, describe, jsonOk, loggingMiddleware } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const logging = loggingMiddleware(console);
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });

  const server = laminar({ app: logging(app), port: 3300 });
  await start(server);

  console.log(describe(server));
};

main();
