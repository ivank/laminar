import { laminar, Resolver, Context } from '@ovotech/laminar';

const main: Resolver<Context> = ctx => ctx.body;
laminar({ port: 3333, app: main });
