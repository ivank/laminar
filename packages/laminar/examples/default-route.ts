import { get, router, init, jsonOk, textNotFound, HttpService } from '@laminarjs/laminar';

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    async () => textNotFound('Woopsy'),
  ),
});

init({ initOrder: [http], logger: console });
