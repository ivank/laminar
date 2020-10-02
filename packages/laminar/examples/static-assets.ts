import { get, httpServer, router, staticAssets, start, jsonOk, describe } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = httpServer({
    port: 3333,
    app: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', () => jsonOk({ health: 'ok' })),
    ),
  });
  await start(server);
  console.log(describe(server));
};

main();
