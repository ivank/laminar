import { httpServer, start, describe, openApi, textOk, setCookie } from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await openApi({
    api: join(__dirname, 'oapi-api-key.yaml'),
    security: {
      /**
       * Implement cookie security.
       */
      CookieSecurity: ({ cookies, scopes }) => verifyToken({ secret }, cookies?.auth, scopes),
    },
    paths: {
      '/session': {
        post: ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: () => textOk('OK'),
        post: ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
    },
  });
  const server = httpServer({ app });
  await start(server);
  console.log(describe(server));
};

main();
