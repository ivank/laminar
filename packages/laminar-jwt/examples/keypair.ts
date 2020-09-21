import { get, post, laminar, router, start, jsonOk, App, describe } from '@ovotech/laminar';
import { authMiddleware, createSession } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

const publicKey = readFileSync(join(__dirname, './public-key.pem'), 'utf8');
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

// This middleware would only add security related functions to the context, without restricting any access
// You can specify public and private keys, as well as verify options
// to be passed down to the underlying jsonwebtoken package
const auth = authMiddleware({ secret: publicKey, options: { clockTolerance: 2 } });

// A middleware that would actually restrict access
const onlyLoggedIn = auth();
const onlyAdmin = auth(['admin']);

const app: App = router(
  get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
  post('/session', ({ body }) =>
    jsonOk(createSession({ secret: privateKey, options: { algorithm: 'RS256' } }, body)),
  ),
  post(
    '/test',
    onlyAdmin(({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    onlyLoggedIn(() => jsonOk('index')),
  ),
);

const server = laminar({ port: 3333, app });
start(server).then(() => console.log(describe(server)));
