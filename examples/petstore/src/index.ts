import { describe, start, stop } from '@ovotech/laminar';
import { createApp } from './app';
import { sign } from 'jsonwebtoken';
import { Pool } from 'pg';

const server = async (env: NodeJS.ProcessEnv): Promise<void> => {
  if (env.SECRET === undefined) {
    throw new Error('Need SECRET env variable');
  }
  if (env.PG === undefined) {
    throw new Error('Need PG env variable');
  }

  const pool = new Pool({ connectionString: env.PG });
  const port = Number(env.PORT ?? '3344');
  const hostname = env.HOST ?? 'localhost';
  const secret = env.SECRET;

  const app = await createApp({ secret, port, hostname, pool, logger: console });

  await start(app);
  console.log(describe(app));

  // We generate a token to be able to login and interact with the service
  const token = sign({ email: 'me@example.com' }, secret);
  console.log(
    `\nAccess with curl:\n\n  curl -H 'Authorization: Bearer ${token}' http://${hostname}:${port}/pets\n`,
  );

  process.on('SIGTERM', async () => {
    await pool.end();
    await stop(app);
    console.log('Stopped Successfully');
  });
};

server(process.env);
