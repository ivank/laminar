import { get, laminar, Context, Middleware, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

interface Logger {
  logger: (message: string) => void;
}

const withLogging: Middleware<Logger, Context> = resolver => {
  const logger = console.log;

  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = resolver({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const resolver = router<Logger>(
  get('/.well-known/health-check', () => ({ health: 'ok' })),
  get('/users/{id}', ({ path, logger }) => {
    logger('More stuff');
    return findUser(path.id);
  }),
);

const main = async (): Promise<void> => {
  const app = withLogging(resolver);
  const server = await laminar({ app, port: 8082 });
  console.log('Started', server.address());
};

main();
