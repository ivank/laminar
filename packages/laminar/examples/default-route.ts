import { get, laminar, router, jsonOk, textNotFound, start, describe } from '@ovotech/laminar';

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    () => textNotFound('Woopsy'),
  ),
});

start(server).then(() => console.log(describe(server)));
