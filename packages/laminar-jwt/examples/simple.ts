import { get, post, start, httpServer, jsonOk, router, App, describe } from '@ovotech/laminar';
import { authMiddleware, createSession } from '@ovotech/laminar-jwt';

const secret = '123';
const auth = authMiddleware({ secret });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const app: App = router(
  get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
  post('/session', ({ body }) => jsonOk(createSession({ secret }, body))),
  post(
    '/test',
    admin(({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    loggedIn(() => jsonOk('index')),
  ),
);

const server = httpServer({ app });

start(server).then(() => console.log(describe(server)));
