import { start, laminar, describe, jsonOk } from '@ovotech/laminar';
import { jwkPublicKey, keycloakJwtSecurityResolver, createSession } from '@ovotech/laminar-jwt';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as nock from 'nock';

/**
 * Make sure we have some response from a url
 */
const jwkFile = readFileSync(join(__dirname, './jwk.json'), 'utf8');
nock('http://example.com/').get('/jwk.json').reply(200, JSON.parse(jwkFile));

/**
 * The public key is now a function that would attempt to retrieve the jwk from a url
 * You can also cache it or specify the max age, which by default is 0 and would never expire.
 */
const publicKey = jwkPublicKey({ uri: 'http://example.com/jwk.json', cache: true });
const privateKey = readFileSync(join(__dirname, './private-key.pem'), 'utf8');

const keyid = JSON.parse(jwkFile).keys[0].kid;
const jwtSign = { secret: privateKey, options: { algorithm: 'RS256' as const, keyid } };

const main = async () => {
  const jwtSecurity = keycloakJwtSecurityResolver({
    secret: publicKey,
    service: 'my-service-name',
  });

  const app = await createOapi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurity },
    paths: {
      '/session': {
        post: ({ body }) => jsonOk(createSession(jwtSign, body)),
      },
      '/test': {
        get: ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
        post: ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
      },
    },
  });
  const server = laminar({ port: 3333, app });
  await start(server);
  console.log(describe(server));
};

main();
