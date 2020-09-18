import { laminar, start, response } from '@ovotech/laminar';

start(laminar({ port: 3333, app: ({ body }) => response({ body }) }));
