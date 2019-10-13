import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { parseQueryObjects } from './helpers';
import { Method, Context } from './types';

export const toContext = async (req: IncomingMessage): Promise<Context> => {
  const url = req.url ? parse(req.url, true) : { query: {} };
  return {
    body: req,
    url,
    method: req.method as Method,
    query: parseQueryObjects(url.query),
    cookies: req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined,
    headers: req.headers,
  };
};
