import { get, post, laminar, router, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, auth } from '@ovotech/laminar-jwt';

const bodyParser = createBodyParser();
// This middleware would only add security related functions to the context, without restricting any access
const jwtSecurity = createJwtSecurity('secret');

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
