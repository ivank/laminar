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
