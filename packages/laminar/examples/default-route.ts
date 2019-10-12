import { get, defaultRoute, laminar, router, response } from '@ovotech/laminar';

laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => ({ health: 'ok' })),
    defaultRoute(() => response({ status: 404, body: 'Woopsy' })),
  ),
});
