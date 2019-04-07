import { Context, laminar, Middleware } from '@ovotech/laminar';
import { oapi } from '@ovotech/laminar-oapi';
import { createServer } from 'http';
import { join } from 'path';

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
  const app = withLogging<Context>(
    await oapi({
      yamlFile: join(__dirname, 'simple.yaml'),
      paths: {
        '/user/{id}': {
          get: ({ path, logger }) => {
            logger('Something else');
            return findUser(path.id);
          },
        },
      },
    }),
  );

  createServer(laminar(app)).listen(8080, () => {
    console.log('Server started');
  });
};

start();
