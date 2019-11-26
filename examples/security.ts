import { createLaminar, HttpError, createBodyParser } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });
const validate = (authorizaitonHeader?: string) => {
  if (authorizaitonHeader !== 'Secret Pass') {
    throw new HttpError(403, { message: 'Unkown user' });
  }
};

const main = async () => {
  const bodyParser = createBodyParser();
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    security: {
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });
  const laminar = createLaminar({ app: bodyParser(app), port: 8081 });
  await laminar.start();
  console.log('Started', laminar.server.address());
};

main();
