import { get, post, start, router, laminar, jsonOk, describe } from '@ovotech/laminar';
import { jwkPublicKey, createSession, JWTSign, JWTVerify } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nock from 'nock';
import { authMiddleware } from '@ovotech/laminar-jwt/src';

/**
 * Make sure we have some response from a url
 */
const jwkFile = JSON.parse(readFileSync(join(__dirname, './jwk.json'), 'utf8'));
nock('http://example.com/').get('/jwk.json').reply(200, jwkFile);

/**
 * The public key is now a function that would attempt to retrieve the jwk from a url
 * You can also cache it or specify the max age, which by default is 0 and would never expire.
 */
const publicKey = jwkPublicKey({ uri: 'http://example.com/jwk.json', cache: true });
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

const signOptions: JWTSign = {
  secret: privateKey,
  options: { algorithm: 'RS256', keyid: jwkFile.keys[0].kid },
};
const verifyOptions: JWTVerify = { secret: publicKey };

const auth = authMiddleware(verifyOptions);

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    post('/session', ({ body }) => jsonOk(createSession(signOptions, body))),
    post(
      '/test',
      admin(({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
    ),
    get(
      '/test',
      loggedIn(() => jsonOk('index')),
    ),
  ),
});

start(server).then(() => console.log(describe(server)));
