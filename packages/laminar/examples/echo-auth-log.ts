import { createLaminar, Context, message, Resolver } from '@ovotech/laminar';

const auth = (next: Resolver<Context>): Resolver<Context> => ctx => {
  if (ctx.headers.authorization !== 'Me') {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const log = (next: Resolver<Context>): Resolver<Context> => ctx => {
  console.log('Requested', ctx.body);
  const response = next(ctx);
  console.log('Responded', response);
  return response;
};

const main: Resolver<Context> = ctx => ctx.body;

createLaminar({ port: 3333, app: log(auth(main)) }).start();
