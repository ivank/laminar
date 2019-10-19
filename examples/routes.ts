import { get, laminar, router, createBodyParser } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });

const main = async (): Promise<void> => {
  const bodyParser = createBodyParser();
  const server = await laminar({
    app: bodyParser(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        get('/users/{id}', ({ path }) => findUser(path.id)),
      ),
    ),
    port: 8082,
  });
  console.log('Started', server.address());
};

main();
