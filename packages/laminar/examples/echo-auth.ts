import { createLaminar, Context, message, Resolver } from '@ovotech/laminar';

const auth = (next: Resolver<Context>): Resolver<Context> => ctx => {
  if (ctx.headers.authorization !== 'Me') {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const main: Resolver<Context> = ctx => ctx.body;

createLaminar({ port: 3333, app: auth(main) }).start();
