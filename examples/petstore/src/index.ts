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

  /**
   * We generate a short lived token to be able to login and interact with the service
   * This is just for demonstration and shouldn't be used in production
   */
  const token = sign({ email: 'me@example.com' }, secret, { expiresIn: '1 day' });
  console.log(
    `\nAccess with curl:\n\n  curl -H 'Authorization: Bearer ${token}' http://${hostname}:${port}/pets\n`,
  );

  /**
   * Catch the termination event to shut down the app gracefully.
   * The app is stopped before the db so that there is now chance of starting to process a request without a db
   */
  process.on('SIGTERM', async () => {
    await stop(app);
    await pool.end();
    console.log('Stopped Successfully');
  });
};

server(process.env);
