import { HttpService, response, init } from '@laminarjs/laminar';

const http = new HttpService({ listener: async ({ body }) => response({ body }) });

init({ initOrder: [http], logger: console });
