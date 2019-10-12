import { get, put, laminar, router, createCors } from '@ovotech/laminar';

const users: { [key: string]: string } = {
  '1': 'John',
  '2': 'Foo',
};

const cors = createCors({
  allowOrigin: origin => ['example.com', 'localhost'].includes(origin),
});

laminar({
  port: 3333,
  app: cors(
    router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      get('/users', () => users),
      get('/users/{id}', ({ path }) => users[path.id]),
      put('/users/{id}', ({ path, body }) => {
        users[path.id] = body;
        return users[path.id];
      }),
    ),
  ),
});
