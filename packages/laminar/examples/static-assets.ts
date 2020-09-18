import { get, laminar, router, directory, start, jsonOk, describe } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = laminar({
    port: 3333,
    app: router(
      directory('/my-folder', join(__dirname, 'assets')),
      get('/', () => jsonOk({ health: 'ok' })),
    ),
  });
  await start(server);
  console.log(describe(server));
};

main();
