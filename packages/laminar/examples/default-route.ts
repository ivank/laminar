import { get, router, init, jsonOk, textNotFound, HttpService } from '@laminar/laminar';

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    async () => textNotFound('Woopsy'),
  ),
});

init({ initOrder: [http], logger: console });
