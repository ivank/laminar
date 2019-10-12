import { get, laminar, Context, Middleware, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

interface LoggerContext {
  logger: (message: string) => void;
}

const logging: Middleware<LoggerContext, Context> = next => {
  const logger = console.log;

  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = next({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const main = async (): Promise<void> => {
  const server = await laminar({
    app: logging(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        get('/users/{id}', ({ path, logger }) => {
          logger('More stuff');
          return findUser(path.id);
        }),
      ),
    ),
    port: 8082,
  });
  console.log('Started', server.address());
};

main();
