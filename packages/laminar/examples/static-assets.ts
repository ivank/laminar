import { get, createLaminar, router, createBodyParser, staticDirectory } from '@ovotech/laminar';
import { join } from 'path';

const bodyParser = createBodyParser();

createLaminar({
  port: 3333,
  app: bodyParser(
    router(
      staticDirectory('/my-folder', join(__dirname, 'assets')),
      get('/', () => ({ health: 'ok' })),
    ),
  ),
}).start();
