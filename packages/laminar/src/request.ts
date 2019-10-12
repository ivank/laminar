import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { parseQueryObjects } from './helpers';
import { Laminar, LaminarRequest, Method } from './types';

export const request = async (req: IncomingMessage): Promise<LaminarRequest> => {
  const url = req.url ? parse(req.url, true) : { query: {} };
  return {
    [Laminar]: true,
    body: req,
    url,
    method: req.method as Method,
    query: parseQueryObjects(url.query),
    cookies: req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined,
    headers: req.headers,
  };
};
