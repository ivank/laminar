import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { parseQueryObjects } from './helpers';
import { Method, Context } from './types';

export const toContext = async (req: IncomingMessage): Promise<Context> => {
  const url = parse(req.url ?? '', true);
  return {
    body: req,
    url,
    method: req.method as Method,
    query: parseQueryObjects(url.query),
    cookies: req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined,
    headers: req.headers,
  };
};
