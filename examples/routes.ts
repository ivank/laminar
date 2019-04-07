import { get, laminar, routes } from '@ovotech/laminar';
import { createServer } from 'http';

const findUser = (id: string) => ({ id, name: 'John' });

const app = laminar(
  routes(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    get('/users/{id}', ({ path }) => findUser(path.id)),
  ),
);

createServer(app).listen(8080, () => {
  console.log('Server started');
});
