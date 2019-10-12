import { laminar } from '@ovotech/laminar';
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

const main = async (): Promise<void> => {
  const app = await createOapi(config);
  const server = await laminar({ app, port: 8081 });
  console.log('Started', server.address());
};

main();
