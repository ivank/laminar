import { HttpService, jsonOk, init } from '@laminarjs/laminar';

const http = new HttpService({
  listener: async ({ body }) => jsonOk({ name: body.name, file: body['my-file'][0].data.toString() }),
});

init({ initOrder: [http], logger: console });
