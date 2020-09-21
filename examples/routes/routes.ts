import { get, jsonOk, router, laminar, describe } from '@ovotech/laminar';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const server = laminar({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users/{id}', ({ path }) => jsonOk(findUser(path.id))),
    ),
    port: 8082,
  });

  console.log(describe(server));
};

main();
