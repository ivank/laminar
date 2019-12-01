import { createLaminar, createBodyParser, describeLaminar } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';
import { Config } from './oapi.yaml';

const start = async () => {
  const config: Config = {
    api: join(__dirname, 'oapi.yaml'),
    paths: {
      '/test': {
        post: ({ body }) => ({ text: 'ok', user: body }),
        get: () => ({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  };
  const bodyParser = createBodyParser();
  const app = await createOapi(config);
  const laminar = createLaminar({ port: 3333, app: bodyParser(app) });
  await laminar.start();
  console.log(describeLaminar(laminar));
};

start();
