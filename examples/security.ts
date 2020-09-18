import { laminar, start, jsonOk, HttpError, describe, loggingMiddleware } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });
const validate = (authorizaitonHeader?: string) => {
  if (authorizaitonHeader !== 'Secret Pass') {
    throw new HttpError(403, { message: 'Unkown user' });
  }
};

const main = async () => {
  const logging = loggingMiddleware(console);
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    security: {
      JWT: ({ headers }) => validate(headers.authorization),
    },
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
