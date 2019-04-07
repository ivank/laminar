import * as cookie from 'cookie';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { parse, URLSearchParams } from 'url';
import { concatStream, parseQueryObjects } from './helpers';
import { HttpError } from './HttpError';
import { Laminar, LaminarRequest, Method } from './types';

export const parseContentType = (value: string) => {
  const parts = /^([^\/]+)\/([^\+\;]+)(\+[^;]+)?(\;.*)?/.exec(value);
  if (!parts) {
    return null;
  }
  const [, type, subtype, suffix] = parts;
  return `${type.trim()}/${suffix ? suffix.substr(1).trim() : subtype.trim()}`.toLowerCase();
};

const parseBody = async (stream: Readable, contentType?: string) => {
  if (!contentType) {
    return stream;
  }
  try {
    const type = parseContentType(contentType);
    if (type === null) {
      return stream;
    } else if (type === 'application/json') {
      return JSON.parse(String(await concatStream(stream)));
    } else if (type === 'application/x-www-form-urlencoded') {
      return new URLSearchParams(String(await concatStream(stream)));
    } else if (type.match(/^text\/.*/)) {
      return String(await concatStream(stream));
    } else {
      return stream;
    }
  } catch (error) {
    throw new HttpError(400, { message: `Error parsing request body`, error: error.message });
  }
};

export const request = async (req: IncomingMessage): Promise<LaminarRequest> => {
  const body = await parseBody(req, req.headers['content-type']);
  const url = parse(req.url!, true);
  return {
    [Laminar]: true,
    body,
    url,
    method: req.method as Method,
    query: parseQueryObjects(url.query),
    cookies: req.headers.cookie ? cookie.parse(req.headers.cookie) : undefined,
    headers: req.headers,
  };
};
