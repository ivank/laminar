import { get, post, laminar, router } from '../src';

const main = async (): Promise<void> => {
  const server = await laminar({
    port: 3333,
    app: router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      post('/test', () => 'submited'),
      get('/test', () => 'index'),
    ),
  });

  console.log(server.address());
};

main();
