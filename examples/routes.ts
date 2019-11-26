import { get, createLaminar, router, createBodyParser } from '@ovotech/laminar';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const bodyParser = createBodyParser();
  const laminar = createLaminar({
    app: bodyParser(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        get('/users/{id}', ({ path }) => findUser(path.id)),
      ),
    ),
    port: 8082,
  });

  console.log('Started', laminar.server.address());
};

main();
