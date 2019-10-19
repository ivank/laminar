import { get, laminar, Middleware, router, createBodyParser } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

interface LoggingContext {
  logger: (message: string) => void;
}

const logging: Middleware<LoggingContext> = next => {
  const logger = console.log;

  return ctx => {
    logger('Requesting', ctx.url.pathname);
    const response = next({ ...ctx, logger });
    logger('Response made', response);
    return response;
  };
};

const bodyParser = createBodyParser();

const main = async (): Promise<void> => {
  const server = await laminar({
    app: bodyParser(
      logging(
        router(
          get('/.well-known/health-check', () => ({ health: 'ok' })),
          get('/users/{id}', ({ path, logger }) => {
            logger('More stuff');
            return findUser(path.id);
          }),
        ),
      ),
    ),
    port: 8082,
  });
  console.log('Started', server.address());
};

main();
