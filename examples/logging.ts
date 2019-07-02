import { get, laminar, Middleware, router } from '@ovotech/laminar';

const findUser = (id: string) => ({ id, name: 'John' });

interface Logger {
  logger: (message: string) => void;
}

const withLogging: Middleware<Logger> = resolver => {
  const logger = console.log;
  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const app = withLogging(
  router<Logger>(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    get('/users/{id}', ({ path, logger }) => {
      logger('More stuff');
      return findUser(path.id);
    }),
  ),
);

laminar({ app, port: 8080 })
  .then(server => console.log('Started', server.address()))
  .catch(error => console.log(error));
