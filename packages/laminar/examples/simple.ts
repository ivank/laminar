import { get, post, httpServer, start, router, describe, jsonOk, textOk } from '@ovotech/laminar';

const main = async () => {
  const server = httpServer({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await start(server);

  console.log(describe(server));
};

main();
