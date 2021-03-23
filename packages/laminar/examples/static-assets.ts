import { get, HttpService, router, staticAssets, jsonOk, init } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const http = new HttpService({
    listener: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', async () => jsonOk({ health: 'ok' })),
    ),
  });
  await init({ initOrder: [http], logger: console });
};

main();
