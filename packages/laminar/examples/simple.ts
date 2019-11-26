import { get, post, createLaminar, router } from '@ovotech/laminar';

const main = async () => {
  const laminar = createLaminar({
    port: 3333,
    app: router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      post('/test', () => 'submited'),
      get('/test', () => 'index'),
    ),
  });
  await laminar.start();

  console.log(laminar.server.address());
};

main();
