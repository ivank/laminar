import { createLaminar, createBodyParser, describeLaminar } from '@ovotech/laminar';
import {
  createJwtSecurity,
  JWTContext,
  JWTSecurity,
  jwkPublicKey,
  validateScopesKeycloak,
} from '@ovotech/laminar-jwt';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';
import { readFileSync } from 'fs';
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

const start = async () => {
  const bodyParser = createBodyParser();
  const jwtSecurity = createJwtSecurity({
    publicKey,
    privateKey,
    signOptions: { algorithm: 'RS256', keyid: '54eb0f68-bbf5-44ae-a345-fbd56c50e1e8' },
    validateScopes: validateScopesKeycloak('my-service-name'),
  });

  const app = await createOapi<JWTContext>({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity },
    paths: {
      '/session': {
        post: ({ createSession, body }) => createSession(body),
      },
      '/test': {
        get: ({ authInfo }) => ({ text: 'ok', user: authInfo }),
        post: ({ authInfo }) => ({ text: 'ok', user: authInfo }),
      },
    },
  });
  const laminar = createLaminar({ port: 3333, app: bodyParser(jwtSecurity(app)) });
  await laminar.start();
  console.log(describeLaminar(laminar));
};

start();
