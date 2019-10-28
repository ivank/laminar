# Laminar JSON Web Tokens

A json web token middleware for laminar

### Usage

> [examples/simple.ts](examples/simple.ts)

```typescript
import { get, post, laminar, router, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, auth } from '@ovotech/laminar-jwt';

const bodyParser = createBodyParser();
// This middleware would only add security related functions to the context, without restricting any access
const jwtSecurity = createJwtSecurity({ secret: 'secret' });

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
import { laminar, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, JWTContext, JWTSecurity } from '@ovotech/laminar-jwt';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const start = async (): Promise<void> => {
  const bodyParser = createBodyParser();
  const jwtSecurity = createJwtSecurity({ secret: 'secret' });
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
  const server = await laminar({ port: 3333, app: bodyParser(jwtSecurity(app)) });
  console.log('Started', server.address());
};

start();
```

### Public / Private keys

You can specify public / private key pair (where the private key is used for signing and the public for verifying)

> [examples/keypair.ts](examples/keypair.ts)

```typescript
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
```

### JWK for public keys

JWK are also supported with the `jwkPublicKey` function. It can also cache the jwk request.

> [examples/jwk.ts](examples/jwk.ts)

```typescript
import { get, post, laminar, router, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, auth, jwkPublicKey } from '@ovotech/laminar-jwt';
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

const bodyParser = createBodyParser();
const jwtSecurity = createJwtSecurity({ publicKey, privateKey });

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
