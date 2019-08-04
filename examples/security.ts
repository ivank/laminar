import { laminar, HttpError } from '@ovotech/laminar';
import { withOapi, OapiConfig } from '@ovotech/laminar-oapi';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });
const validate = (authorizaitonHeader: string | undefined): void => {
  if (authorizaitonHeader !== 'Secret Pass') {
    throw new HttpError(403, { message: 'Unkown user' });
  }
};

const config: OapiConfig = {
  api: 'simple.yaml',
  security: {
    JWT: ({ headers }) => validate(headers.authorization),
  },
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
