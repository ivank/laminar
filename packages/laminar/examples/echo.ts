import { laminar, start, response, describe } from '@ovotech/laminar';

const server = laminar({ port: 3333, app: ({ body }) => response({ body }) });

start(server).then(() => console.log(describe(server)));
