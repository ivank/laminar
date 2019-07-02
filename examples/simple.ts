import { laminar } from '@ovotech/laminar';
import { loadYamlFile, withOapi } from '@ovotech/laminar-oapi';

const findUser = (id: string) => ({ id, name: 'John' });

const app = withOapi({
  api: loadYamlFile('simple.yaml'),
  paths: {
    '/user/{id}': {
      get: ({ path }) => findUser(path.id),
    },
  },
});

laminar({ app })
  .then(server => console.log('Started', server.address()))
  .catch(error => console.log(error));
