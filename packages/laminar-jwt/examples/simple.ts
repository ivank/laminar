import { get, post, laminar, router } from '@ovotech/laminar';
import { createJwtSecurity, auth } from '@ovotech/laminar-jwt';

const jwtSecurity = createJwtSecurity('secret');

const onlyLoggedIn = auth();
const onlyAdmin = auth(['admin']);

laminar({
  port: 3333,
  app: jwtSecurity(
    router(
      get('/.well-known/health-check', () => ({ health: 'ok' })),
      post('/session', ({ createSession, body }) => createSession(body)),
      post('/test', onlyAdmin(({ authInfo }) => ({ result: 'ok', user: authInfo }))),
      get('/test', onlyLoggedIn(() => 'index')),
    ),
  ),
});
