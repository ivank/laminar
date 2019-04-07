import { get, laminar, Middleware, routes } from '@ovotech/laminar';
import { createServer } from 'http';

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

const app = laminar(
  withLogging(
    routes(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      get('/users/{id}', ({ path, logger }) => {
        logger('More stuff');
        return findUser(path.id);
      }),
    ),
  ),
);

createServer(app).listen(8080, () => {
  console.log('Server started');
});
