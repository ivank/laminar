import { Middleware } from '@ovotech/laminar';
import { Client } from 'pg';

export interface RequestPg {
  pg: Client;
}

/**
 * Creat a pg connection and pass to each request (simple but not production ready)
 */
export const createPgClient = async (config: string): Promise<Middleware<RequestPg>> => {
  const pg = new Client(config);
  await pg.connect();
  return (next) => (ctx) => next({ ...ctx, pg });
};
