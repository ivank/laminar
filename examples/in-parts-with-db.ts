import { Client } from 'pg';
import {
  get,
  put,
  router,
  message,
  createLaminar,
  createBodyParser,
  createLogging,
  Middleware,
  RouteResolver,
  LoggingContext,
  describeLaminar,
} from '@ovotech/laminar';

// Middleware to connect to postgres
// =================================
interface PGContext {
  pg: Client;
}

const createPgClient = async (config: string): Promise<Middleware<PGContext>> => {
  const pg = new Client(config);
  await pg.connect();
  return next => ctx => next({ ...ctx, pg });
};

// Route Handlers
// =================================
const healthCheck: RouteResolver = () => ({ health: 'ok' });

// Finding a user requires a PG connection
const find: RouteResolver<PGContext> = async ({ path, pg }) => {
  const { rows } = await pg.query('SELECT id, name FROM users WHERE id $1', path.id);

  return rows[0] || message(404, { message: `No User With id ${path.id} was found` });
};

// Updating a user requires a PG connection and logging capablilities
const update: RouteResolver<PGContext & LoggingContext<Console>> = async ({
  path,
  pg,
  body,
  logger,
}) => {
  await pg.query('UPDATE users SET name = $1 WHERE id = $2', body.name, path.id);
  logger.log('info', 'User Updated');

  return message(200, { message: 'User Updated' });
};

// Routes
// =================================
const routes = router(
  get('/.well-known/health-check', healthCheck),
  get('/users/{id}', find),
  put('/users/{id}', update),
);

// App
// ============================

const main = async () => {
  const bodyParser = createBodyParser();
  const logging = createLogging(console);
  const pgClient = await createPgClient('localhost:5432');

  const app = bodyParser(logging(pgClient(routes)));

  const laminar = createLaminar({ app, port: 8082 });
  await laminar.start();

  console.log(describeLaminar(laminar));
};

main();
