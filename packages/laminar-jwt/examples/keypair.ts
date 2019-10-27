import { get, post, laminar, router, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, auth } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

const publicKey = readFileSync(join(__dirname, './public-key.pem'), 'utf8');
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

const bodyParser = createBodyParser();

// This middleware would only add security related functions to the context, without restricting any access
// You can specify public and private keys, as well as verify / sign options
// to be passed down to the underlying jsonwebtoken package
const jwtSecurity = createJwtSecurity({
  publicKey,
  privateKey,
  verifyOptions: { clockTolerance: 2 },
});

// A middleware that would actually restrict access
const onlyLoggedIn = auth();
const onlyAdmin = auth(['admin']);

laminar({
  port: 3333,
  app: bodyParser(
    jwtSecurity(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        post('/session', ({ createSession, body }) => createSession(body)),
        post('/test', onlyAdmin(({ authInfo }) => ({ result: 'ok', user: authInfo }))),
        get('/test', onlyLoggedIn(() => 'index')),
      ),
    ),
  ),
});
