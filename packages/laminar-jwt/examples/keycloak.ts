import { get, post, createLaminar, router, createBodyParser } from '@ovotech/laminar';
import {
  createJwtSecurity,
  auth,
  jwkPublicKey,
  validateScopesKeycloak,
} from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nock from 'nock';

/**
 * Make sure we have some response from a url
 */
const jwkFile = readFileSync(join(__dirname, './jwk.json'), 'utf8');
nock('http://example.com/')
  .get('/jwk.json')
  .reply(200, JSON.parse(jwkFile));

/**
 * The public key is now a function that would attempt to retrieve the jwk from a url
 * You can also cache it or specify the max age, which by default is 0 and would never expire.
 */
const publicKey = jwkPublicKey({ uri: 'http://example.com/jwk.json', cache: true });
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

/**
 * We add a custom validateScopes function it would recieve the decrypted token as well as the required roles
 * If the roles given to the client token do not match the required roles we'll throw a 401 error.
 */
const validateScopes = validateScopesKeycloak('my-service-name');
const keyid = JSON.parse(jwkFile).keys[0].kid;

const bodyParser = createBodyParser();
const jwtSecurity = createJwtSecurity({
  publicKey,
  privateKey,
  validateScopes,
  signOptions: { algorithm: 'RS256', keyid },
});

// A middleware that would actually restrict access
const onlyLoggedIn = auth();
const onlyAdmin = auth(['admin-role']);

createLaminar({
  port: 3333,
  app: bodyParser(
    jwtSecurity(
      router(
        get('/.well-known/health-check', () => ({ health: 'ok' })),
        post('/session', ({ createSession, body }) => createSession(body)),
        post(
          '/test',
          onlyAdmin(({ authInfo }) => ({ result: 'ok', user: authInfo })),
        ),
        get(
          '/test',
          onlyLoggedIn(() => 'index'),
        ),
      ),
    ),
  ),
}).start();
