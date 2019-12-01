import { createLaminar, createBodyParser, describeLaminar } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  const bodyParser = createBodyParser();
  const app = await createOapi({
    api: join(__dirname, 'simple.yaml'),
    paths: {
      '/user/{id}': {
        get: ({ path }) => findUser(path.id),
      },
    },
  });

  const laminar = createLaminar({ app: bodyParser(app), port: 8081 });
  await laminar.start();

  console.log(describeLaminar(laminar));
};

main();
