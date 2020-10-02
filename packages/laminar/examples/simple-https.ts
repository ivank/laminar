import { get, post, httpsServer, router, start, textOk, jsonOk, describe } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const server = httpsServer({
    port: 8443,
    serverOptions: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },
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
