import { httpServer, start, response, describe } from '@ovotech/laminar';

const server = httpServer({ port: 3333, app: ({ body }) => response({ body }) });

start(server).then(() => console.log(describe(server)));
