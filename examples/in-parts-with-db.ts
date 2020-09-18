import { Client } from 'pg';
import {
  get,
  put,
  router,
  jsonOk,
  jsonNotFound,
  loggingMiddleware,
  Middleware,
  AppRoute,
  RequestLogging,
  describe,
  laminar,
  start,
} from '@ovotech/laminar';

// Middleware to connect to postgres
// =================================
interface RequestPg {
  pg: Client;
}

const createPgClient = async (config: string): Promise<Middleware<RequestPg>> => {
  const pg = new Client(config);
  await pg.connect();
  return (next) => (ctx) => next({ ...ctx, pg });
};

// Route Handlers, each can be in a different file
// ================================================
const healthCheck: AppRoute = () => jsonOk({ health: 'ok' });

// Finding a user requires a PG connection
const find: AppRoute<RequestPg> = async ({ path, pg }) => {
  const { rows } = await pg.query('SELECT id, name FROM users WHERE id $1', [path.id]);

  return rows[0]
    ? jsonOk(rows[0])
    : jsonNotFound({ message: `No User With id ${path.id} was found` });
};

// Updating a user requires a PG connection and logging capablilities
const update: AppRoute<RequestPg & RequestLogging<Console>> = async ({
  path,
  pg,
  body,
  logger,
}) => {
  await pg.query('UPDATE users SET name = $1 WHERE id = $2', [body.name, path.id]);
  logger.log('info', 'User Updated');

  return jsonOk({ message: 'User Updated' });
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
  const logging = loggingMiddleware(console);
  const pgClient = await createPgClient('localhost:5432');

  const app = logging(pgClient(routes));

  const server = laminar({ app, port: 8082 });
  await start(server);

  console.log(describe(server));
};

main();
