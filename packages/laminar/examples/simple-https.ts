import { get, post, createLaminar, router, describeLaminar } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const laminar = createLaminar({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },

    app: router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      post('/test', () => 'submited'),
      get('/test', () => 'index'),
    ),
  });
  await laminar.start();

  console.log(describeLaminar(laminar));
};

main();
