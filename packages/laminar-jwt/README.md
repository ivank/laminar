# Laminar JSON Web Tokens

A json web token middleware for laminar

### Usage

> [examples/simple.ts](examples/simple.ts)

```typescript
import { get, post, start, laminar, jsonOk, router, App, describe } from '@ovotech/laminar';
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

const server = laminar({ port: 3333, app });

start(server).then(() => console.log(describe(server)));
```

### Usage with oapi

If we had this basic oapi.yaml

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/session':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Session' }
  '/test':
    post:
      security:
        - JWTSecurity: ['admin']
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      security:
        - JWTSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  securitySchemes:
    JWTSecurity:
      type: http
      scheme: bearer

  schemas:
    Session:
      additionalProperties: false
      properties:
        jwt:
          type: string
        user:
          $ref: '#/components/schemas/User'
      required:
        - jwt
        - user
    User:
      properties:
        email:
          type: string
        scopes:
          type: array
          items:
            type: string
      required:
        - email

    Test:
      properties:
        text:
          type: string
        user:
          $ref: '#/components/schemas/User'
      required:
        - text
```

And then implement it like this

> [examples/oapi.ts](examples/oapi.ts)

```typescript
import { laminar, start, describe, jsonOk } from '@ovotech/laminar';
import { createSession, jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await createOapi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurityResolver({ secret }) },
    paths: {
      '/session': {
        post: ({ body }) => jsonOk(createSession({ secret }, body)),
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
```

### Public / Private keys

You can specify public / private key pair (where the private key is used for signing and the public for verifying)

> [examples/keypair.ts](examples/keypair.ts)

```typescript
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
```

### JWK for public keys

JWK are also supported with the `jwkPublicKey` function. It can also cache the jwk request.

> [examples/jwk.ts](examples/jwk.ts)

```typescript
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
```

You can test it by running (requires curl and jq):

> [examples/jwk.sh](examples/jwk.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"email":"test@example.com","scopes":["admin"]}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
```

### Keycloak and custom scope validators

In order to use keycloak as public / private pair you'll need to provide a custom function that will validate the required scopes against the data comming from the keycloak token.

If we had a keycloak config like this:

> [examples/keycloak-config.yaml](examples/keycloak-config.yaml)

```yaml
my-service-name:
  defineRoles:
    - admin

other-client-service:
  serviceAccountRoles:
    - admin
```

Then we could implement it with this service:

> [examples/keycloak.ts](examples/keycloak.ts)

```typescript
import { get, post, laminar, router, start, jsonOk, describe } from '@ovotech/laminar';
import { jwkPublicKey, createSession } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nock from 'nock';
import { keycloakAuthMiddleware } from '@ovotech/laminar-jwt/src';

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
const sessionOptions = { secret: privateKey, options: { algorithm: 'RS256' as const, keyid } };

const auth = keycloakAuthMiddleware({ secret: publicKey, service: 'my-service-name' });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const server = laminar({
  port: 3333,
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    post('/session', ({ body }) => jsonOk(createSession(sessionOptions, body))),
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
```

When this is running, you can test it with calls like this (requires curl and jq):

> [examples/keycloak.sh](examples/keycloak.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"email":"test@example.com","resource_access":{"my-service-name":{"roles":["admin"]}}}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
```

With oapi it is the same concempt - we use the scopes that are defined by the open api standard to check against the values from the keycloack resource access value:

> [examples/oapi-keycloak.ts](examples/oapi-keycloak.ts)

```typescript
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
```

When this is running, this can be again test with (requires curl and jq):

> [examples/oapi-keycloak.sh](examples/oapi-keycloak.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"email":"test@example.com","resource_access":{"my-service-name":{"roles":["admin"]}}}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
```

### Docs

`JWTContext` provides two functions: `createSession(user, options?)` and `verifyAuthorization(header?: string, scopes?: string[])`.

```typescript
type createSession = (user: TUser, options?: SignOptions) => Session<TUser>;
```

User has `email` and `scopes`(optional) fields but can have other keys as well. options is passed directly to jsonwebtoken package `sign` function options https://github.com/auth0/node-jsonwebtoken#usage. With it you can for example set `expiresIn` or `notBefore`.

```typescript
type verifyAuthorization = (header?: string, scopes?: string[]) => JWTData;
```

Verifies if an authorization header is valid. Must be in the form of `Bearer {jwt token}`. Additionally would check it against `scopes` if provided.

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by lerna automatically on merge / push to master, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
