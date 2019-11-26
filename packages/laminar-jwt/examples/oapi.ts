import { createLaminar, createBodyParser } from '@ovotech/laminar';
import { createJwtSecurity, JWTContext, JWTSecurity } from '@ovotech/laminar-jwt';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const start = async () => {
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
  const laminar = createLaminar({ port: 3333, app: bodyParser(jwtSecurity(app)) });
  await laminar.start();
  console.log('Started', laminar.server.address());
};

start();
