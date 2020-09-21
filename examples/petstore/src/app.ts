import { Config } from './__generated__/petstore';
import { pathPetsGet, pathPetsIdGet, pathPetsIdDelete, pathPetsPost } from './paths';
import { pgPoolMiddleware, RequestPgPool } from './middleware/pg-pool.middleware';
import { join } from 'path';
import { jwtSecurityResolver, verifyToken } from '@ovotech/laminar-jwt';
import { laminar, Laminar, Logger, loggingMiddleware } from '@ovotech/laminar';
import { createOapi } from '@ovotech/laminar-oapi';
import { petsDbMiddleware, RequestPetsDb } from './middleware';
import { Pool } from 'pg';

export interface Options {
  pool: Pool;
  secret: string;
  port: number;
  hostname: string;
  logger: Logger;
}

export const createApp = async (options: Options): Promise<Laminar> => {
  const jwtVerify = { secret: options.secret };

  const config: Config<RequestPgPool & RequestPetsDb> = {
    api: join(__dirname, '../petstore.yaml'),
    security: {
      // Since JWT tokens are a common case, we have an easy wrapper function to handle it
      BearerAuth: jwtSecurityResolver(jwtVerify),
      ApiKeyAuth: ({ headers, scopes }) => verifyToken(jwtVerify, headers['x-api-key'], scopes),
      CookieAuth: ({ cookies, scopes }) => verifyToken(jwtVerify, cookies.auth, scopes),
      QueryAuth: ({ query, scopes }) => verifyToken(jwtVerify, query.token, scopes),
    },
    paths: {
      '/pets': {
        get: pathPetsGet,
        post: pathPetsPost,
      },
      '/pets/{id}': {
        get: pathPetsIdGet,
        delete: pathPetsIdDelete,
      },
    },
  };

  const oapi = await createOapi(config);
  const pgPool = pgPoolMiddleware(options.pool);
  const petsDb = petsDbMiddleware();
  const logging = loggingMiddleware(options.logger);

  // Apply the middlewares.
  // The typescript types will ensure they are applied in the right order, and no dependencies are missing
  const app = logging(pgPool(petsDb(oapi)));

  return laminar({ app, port: options.port, hostname: options.hostname });
};
