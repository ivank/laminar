import { laminar } from '@ovotech/laminar';
import { createServer } from 'http';
import { join } from 'path';
import { oapi } from '../src';

// const app = routes<Context & WithLogger & WithAuth>(
//   get('.well-known/health-check', ctx => {
//     ctx.logger('auth was', ctx.authInfo);
//     ctx.logger('123');
//     return { healthy: true };
//   }),
//   get('.well-known/swagger.yaml', () => file(join(__dirname, 'swagger.yaml'))),

//   get('user/{id}', async ctx => {
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     return { id: ctx.params.id, name: 'test name' };
//   }),
// );

const start = async () => {
  const yamlFile = join(__dirname, './swagger.yaml');

  const app = await oapi({
    yamlFile,
    paths: {
      '/.well-known/health-check': {
        get: () => ({ healthy: true }),
      },
      '/v1/{accountID}/balance/last-known': {
        get: ctx => {
          console.log(ctx.path);
          return { test: '123', result: ctx.path };
        },
        post: ctx => {
          console.log(ctx.path);
          return { post: true, singleWalletBalance: { value: 1, fuelType: 'DualFuel' } };
        },
      },
    },
  });

  const server = createServer(laminar(app));

  server.listen(8080, () => {
    // tslint:disable-next-line:no-console
    console.log('listening on port 8080');
  });
};

start();
