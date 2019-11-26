import { get, defaultRoute, createLaminar, router, response } from '@ovotech/laminar';

createLaminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    defaultRoute(() => response({ status: 404, body: 'Woopsy' })),
  ),
}).start();
