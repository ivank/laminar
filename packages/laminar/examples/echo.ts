import { createLaminar, Resolver, Context } from '@ovotech/laminar';

const main: Resolver<Context> = ctx => ctx.body;
createLaminar({ port: 3333, app: main }).start();
