import { laminar, createBodyParser } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const main = async (): Promise<void> => {
  const bodyParser = createBodyParser();
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  const server = await laminar({ app: bodyParser(app), port: 8081 });
  console.log('Started', server.address());
};

main();
