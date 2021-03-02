import { httpServer, start, describe, jsonOk, openApi } from '@ovotech/laminar';
import { createSession, jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await openApi({
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
  const server = httpServer({ app });
  await start(server);
  console.log(describe(server));
};

main();
