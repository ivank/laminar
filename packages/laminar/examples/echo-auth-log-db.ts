import { laminar, Context, message, Resolver, Middleware } from '@ovotech/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface DBContext {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 */
const createDbMiddleware = (): Middleware<DBContext, Context> => {
  const db: DB = {
    getValidUser: () => 'Me',
  };

  return next => ctx => next({ ...ctx, db });
};

const auth: Middleware<{}, DBContext & Context> = next => ctx => {
  if (ctx.db.getValidUser() !== ctx.headers.authorization) {
    return message(403, 'Not Me');
  }
  return next(ctx);
};

const log: Middleware<{}, Context> = next => ctx => {
  console.log('Requested', ctx.body);
  const response = next(ctx);
  console.log('Responded', response);
  return response;
};

/**
 * We can also get use of the same databse connection in any middleware downstream
 */
const app: Resolver<DBContext & Context> = (ctx: DBContext & Context) => {
  return { echo: ctx.body, user: ctx.db.getValidUser() };
};

const db = createDbMiddleware();

laminar({ port: 3333, app: log(db(auth(app))) });
