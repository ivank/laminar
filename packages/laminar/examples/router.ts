import { get, put, laminar, router, start, jsonOk, jsonNotFound, describe } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    get('/users', () => jsonOk(users)),
    get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
    put('/users/{id}', ({ path, body }) => {
      users[path.id] = body;
      return jsonOk(users[path.id]);
    }),
    // Default URL handler
    ({ url }) => jsonNotFound({ message: `This url ${url} was not found` }),
  ),
});

start(server).then(() => console.log(describe(server)));
