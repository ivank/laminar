import { createLaminar, createBodyParser } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { Config, UserResponse } from './__generated__/simple';
import { join } from 'path';

const findUser = (id: string): UserResponse => ({ id, name: 'John' });

const config: Config = {
  api: join(__dirname, 'simple.yaml'),
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async () => {
  const bodyParser = createBodyParser();
  const app = await createOapi(config);
  const laminar = createLaminar({ app: bodyParser(app), port: 8081 });
  await laminar.start();
  console.log('Started', laminar.server.address());
};

main();
