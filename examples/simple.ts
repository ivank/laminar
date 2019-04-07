import { laminar } from '@ovotech/laminar';
import { oapi } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const start = async () => {
  const app = await oapi({
    yamlFile: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  createServer(laminar(app)).listen(8080, () => {
    console.log('Server started');
  });
};

start();
