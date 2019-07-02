import { laminar, Middleware } from '@ovotech/laminar';
import { loadYamlFile, withOapi } from '@ovotech/laminar-oapi';

const findUser = (id: string) => ({ id, name: 'John' });

interface Logger {
  logger: (message: string) => void;
}

const withLogging: Middleware<Logger> = resolver => {
  const logger = console.log;
  return async ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = await resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const start = async () => {
  try {
    const app = await withOapi<Logger>({
      api: loadYamlFile('simple.yaml'),
      paths: {
        '/user/{id}': {
          get: ({ path, logger }) => {
            logger('Something else');
            return findUser(path.id);
          },
        },
      },
    });

    const server = await laminar({ app: withLogging(app), port: 8080 });
    console.log('Started', server.address());
  } catch (error) {
    console.log(error);
  }
};

start();
