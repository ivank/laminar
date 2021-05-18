# Laminar JSON Web Tokens

A json web token middleware for laminar

### Usage

> [examples/simple.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/simple.ts)

```typescript
import { get, post, init, HttpService, jsonOk, router, HttpListener } from '@ovotech/laminar';
import { authMiddleware, createSession } from '@ovotech/laminar-jwt';

const secret = '123';
const auth = authMiddleware({ secret });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const listener: HttpListener = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  post('/session', async ({ body }) => jsonOk(createSession({ secret }, body))),
  post(
    '/test',
    admin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    loggedIn(async () => jsonOk('index')),
  ),
);

const http = new HttpService({ listener });

init({ initOrder: [http], logger: console });
```

### Usage with oapi

If we had this basic oapi.yaml

> [examples/oapi.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi.yaml)

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
        # Using the JWTSecurity with admin scopes
        - JWTSecurity: ['admin']
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      security:
        # Using the JWTSecurity with no scopes
        - JWTSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  securitySchemes:
    # Defining the JWTSecurity schema to be used on the routes
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

And then implement it using the helper `jwtSecurityResolver`. That function would return a `securityOk` object if the jwt was validated, with the contents of the jwt, or a 403 error response.

> [examples/oapi.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi.ts)

```typescript
import { HttpService, init, jsonOk, openApi } from '@ovotech/laminar';
import { createSession, jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurityResolver({ secret }) },
    paths: {
      '/session': {
        post: async ({ body }) => jsonOk(createSession({ secret }, body)),
      },
      '/test': {
        get: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
        post: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Cookie security

If you need the old school but still awesome cookie security, OpenAPI can handle that too - [docs for cookie auth with OpenAPI](https://swagger.io/docs/specification/authentication/cookie-authentication/). You can use the "apiKey" security to define it.

> [examples/oapi-api-key.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-api-key.yaml)

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
          application/x-www-form-urlencoded:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
          headers:
            Set-Cookie:
              schema:
                type: string
                example: auth=abcde12345; Path=/; HttpOnly
  '/test':
    post:
      description: Protected by CookieSecurity, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
    get:
      description: Protected by CookieSecurity, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }

components:
  securitySchemes:
    CookieSecurity:
      description: Security using the `auth` cookie. To be used in the routes.
      type: apiKey
      in: cookie
      name: auth

  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    Text:
      type: string
```

Implementing it involves reading the cookie and validating its contents.

> [examples/oapi-api-key.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-api-key.ts)

```typescript
import { HttpService, init, openApi, textOk, setCookie } from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi-api-key.yaml'),
    security: {
      /**
       * Implement cookie security.
       */
      CookieSecurity: ({ cookies, scopes }) => verifyToken({ secret }, cookies?.auth, scopes),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Custom security resolvers

OpenApi supports more security methods, and they can be implemented with a security resolver.
Since a security resolver is just a function that gets request properties and returns either `securityOk` or a `Response` object, we can do a lot of custom things.

> [examples/oapi-custom.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-custom.yaml)

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
          application/x-www-form-urlencoded:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
          headers:
            Set-Cookie:
              schema:
                type: string
                example: auth=abcde12345; Path=/; HttpOnly
  '/test':
    post:
      description: Either CookieSecurity or CloudSchedulerSecurity should match, no scopes
      security:
        - CookieSecurity: []
        - CloudSchedulerSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
    get:
      description: Only CookieSecurity can be used for this route, no scopes, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
  '/unauthorized':
    get:
      responses:
        '403':
          description: Forbidden
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }

components:
  securitySchemes:
    CookieSecurity:
      description: Security using the `auth` cookie. To be used in the routes.
      type: apiKey
      in: cookie
      name: auth
    CloudSchedulerSecurity:
      description: Security using the `X-CloudScheduler` header. To be used in the routes.
      type: apiKey
      in: header
      name: 'x-cloudscheduler'

  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    Text:
      type: string
```

> [examples/oapi-custom.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-custom.ts)

```typescript
import {
  HttpService,
  init,
  openApi,
  redirect,
  isSecurityOk,
  securityOk,
  textOk,
  textForbidden,
  setCookie,
} from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const listener = await openApi({
    api: join(__dirname, 'oapi-custom.yaml'),
    security: {
      /**
       * Implement additional cookie security.
       * In an event of a failure, we'd want to redirect to an error page, instead of returning a 403 response
       */
      CookieSecurity: async ({ cookies, scopes }) => {
        const result = await verifyToken({ secret }, cookies?.auth, scopes);
        return isSecurityOk(result) ? result : redirect('/unauthorized');
      },
      /**
       * Cloud Scheduler would ensure that this header is never sent outside of the app engine environment,
       * so we're safe just checking for the existance of the header.
       */
      CloudSchedulerSecurity: ({ headers }) =>
        headers['x-cloudscheduler'] ? securityOk({}) : textForbidden('Not Cloud Scheduler Job'),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
      '/unauthorized': { get: async () => textForbidden('Forbidden!') },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

### Public / Private keys

You can specify public / private key pair (where the private key is used for signing and the public for verifying)

> [examples/keypair.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/keypair.ts)

```typescript
import { get, post, HttpService, router, init, jsonOk, HttpListener } from '@ovotech/laminar';
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

const listener: HttpListener = router(
  get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
  post('/session', async ({ body }) =>
    jsonOk(createSession({ secret: privateKey, options: { algorithm: 'RS256' } }, body)),
  ),
  post(
    '/test',
    onlyAdmin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
  ),
  get(
    '/test',
    onlyLoggedIn(async () => jsonOk('index')),
  ),
);

const http = new HttpService({ listener });
init({ initOrder: [http], logger: console });
```

### JWK for public keys

JWK are also supported with the `jwkPublicKey` function. It can also cache the jwk request.

> [examples/jwk.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/jwk.ts)

```typescript
import { get, post, init, router, HttpService, jsonOk } from '@ovotech/laminar';
import { jwkPublicKey, createSession, authMiddleware } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nock from 'nock';

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

const signOptions = {
  secret: privateKey,
  options: { algorithm: 'RS256' as const, keyid: jwkFile.keys[0].kid },
};
const verifyOptions = { secret: publicKey };

const auth = authMiddleware(verifyOptions);

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    post('/session', async ({ body }) => jsonOk(createSession(signOptions, body))),
    post(
      '/test',
      admin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
    ),
    get(
      '/test',
      loggedIn(async () => jsonOk('index')),
    ),
  ),
});

init({ initOrder: [http], logger: console });
```

You can test it by running (requires curl and jq):

> [examples/jwk.sh](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/jwk.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"email":"test@example.com","scopes":["admin"]}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
```

### Keycloak and custom scope validators

In order to use keycloak as public / private pair you'll need to provide a custom function that will validate the required scopes against the data comming from the keycloak token.

If we had a keycloak config like this:

> [examples/keycloak-config.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/keycloak-config.yaml)

```yaml
my-service-name:
  defineRoles:
    - admin

other-client-service:
  serviceAccountRoles:
    - admin
```

Then we could implement it with this service:

> [examples/keycloak.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/keycloak.ts)

```typescript
import { get, post, HttpService, router, init, jsonOk } from '@ovotech/laminar';
import { jwkPublicKey, createSession, keycloakAuthMiddleware } from '@ovotech/laminar-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
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
const sessionOptions = { secret: privateKey, options: { algorithm: 'RS256' as const, keyid } };

const auth = keycloakAuthMiddleware({ secret: publicKey, service: 'my-service-name' });

// A middleware that would actually restrict access
const loggedIn = auth();
const admin = auth(['admin']);

const http = new HttpService({
  listener: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    post('/session', async ({ body }) => jsonOk(createSession(sessionOptions, body))),
    post(
      '/test',
      admin(async ({ authInfo }) => jsonOk({ result: 'ok', user: authInfo })),
    ),
    get(
      '/test',
      loggedIn(async () => jsonOk('index')),
    ),
  ),
});
init({ initOrder: [http], logger: console });
```

When this is running, you can test it with calls like this (requires curl and jq):

> [examples/keycloak.sh](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/keycloak.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"clientId":"test","resource_access":{"my-service-name":{"roles":["admin"]}}}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
```

With oapi it is the same concempt - we use the scopes that are defined by the open api standard to check against the values from the keycloack resource access value:

> [examples/oapi-keycloak.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-keycloak.ts)

```typescript
import { init, HttpService, jsonOk, openApi } from '@ovotech/laminar';
import { jwkPublicKey, keycloakJwtSecurityResolver, createSession } from '@ovotech/laminar-jwt';
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

  const listener = await openApi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurity },
    paths: {
      '/session': {
        post: async ({ body }) => jsonOk(createSession(jwtSign, body)),
      },
      '/test': {
        get: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
        post: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ initOrder: [http], logger: console });
};

main();
```

When this is running, this can be again test with (requires curl and jq):

> [examples/oapi-keycloak.sh](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-keycloak.sh)

```bash
JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"clientId":"test","resource_access":{"my-service-name":{"roles":["admin"]}}}' | jq '.jwt' -r`
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

Deployment is preferment by lerna automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
