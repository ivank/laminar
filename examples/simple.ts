import { laminar } from '@ovotech/laminar';
import { withOapi, OapiConfig } from '@ovotech/laminar-oapi';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const config: OapiConfig = {
  api: 'simple.yaml',
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
};

const main = async (): Promise<void> => {
  const resolver = await withOapi(config);
  const server = await laminar({ app: resolver, port: 8081 });
  console.log('Started', server.address());
};

main();
