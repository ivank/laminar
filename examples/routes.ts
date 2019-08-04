import { get, laminar, router } from '@ovotech/laminar';

interface User {
  id: string;
  name: string;
}

const findUser = (id: string): User => ({ id, name: 'John' });
const resolver = router(
  get('/.well-known/health-check', () => ({ health: 'ok' })),
  get('/users/{id}', ({ path }) => findUser(path.id)),
);

const main = async (): Promise<void> => {
  const server = await laminar({ app: resolver, port: 8082 });
  console.log('Started', server.address());
};

main();
