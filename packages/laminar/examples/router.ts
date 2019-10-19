import { get, put, laminar, router, createBodyParser } from '@ovotech/laminar';

const users: { [key: string]: string } = {
  '1': 'John',
  '2': 'Foo',
};

const bodyParser = createBodyParser();

laminar({
  port: 3333,
  app: bodyParser(
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
