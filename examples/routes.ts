import { get, laminar, router } from '@ovotech/laminar';

const findUser = (id: string) => ({ id, name: 'John' });

const app = router(
  get('/.well-known/health-check', () => ({ health: 'ok' })),
  get('/users/{id}', ({ path }) => findUser(path.id)),
);

laminar({ app })
  .then(server => console.log('Started', server.address()))
  .catch(error => console.log(error));
