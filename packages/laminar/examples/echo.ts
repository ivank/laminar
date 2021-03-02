import { httpServer, start, response, describe } from '@ovotech/laminar';

const server = httpServer({ app: ({ body }) => response({ body }) });

start(server).then(() => console.log(describe(server)));
