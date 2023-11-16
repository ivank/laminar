import { HttpService, response, init } from '@laminar/laminar';

const http = new HttpService({ listener: async ({ body }) => response({ body }) });

init({ initOrder: [http], logger: console });
