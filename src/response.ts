import * as cookie from 'cookie';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import { Laminar, LaminarResponse, ResolverResponse } from './types';

export const response = ({
  body,
  status = 200,
  headers = {},
  cookies,
}: Partial<LaminarResponse>): LaminarResponse => {
  console.log('body!!!', body);
  return {
    [Laminar]: true,
    status,
    headers,
    cookies,
    body:
      body instanceof Readable ||
      body instanceof Buffer ||
      typeof body === 'string' ||
      body === undefined
        ? body
        : JSON.stringify(body),
  };
};

export const isResponse = (res: ResolverResponse): res is LaminarResponse =>
  typeof res === 'object' && Laminar in res;

export const message = (status: number, body: {} | string) => response({ status, body });

export const redirect = (url: string, partial?: Partial<LaminarResponse>) =>
  response({
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      Location: url,
      ...(partial ? partial.headers : undefined),
    },
    body: `Redirecting to ${url}.`,
    status: 302,
    ...partial,
  });

export const file = (filename: string, partial?: Partial<LaminarResponse>) =>
  response({
    body: createReadStream(filename),
    headers: {
      'Content-Length': statSync(filename).size,
      ...(partial ? partial.headers : undefined),
    },
    ...partial,
  });

const contentType = (body: LaminarResponse['body']) => {
  return body instanceof Readable || body instanceof Buffer
    ? 'application/octet-stream'
    : typeof body === 'object'
    ? 'application/json'
    : 'text/plain';
};

const contentLength = (body: LaminarResponse['body']) =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

const setCookie = (cookies: { [key: string]: string }) =>
  Object.entries(cookies).map(([name, value]) => cookie.serialize(name, value));

export const resolveResponse = (res: LaminarResponse) => {
  return {
    ...res,
    headers: {
      'Content-Type': contentType(res.body),
      'Content-Length': res.body ? contentLength(res.body) : undefined,
      'Set-Cookie': res.cookies ? setCookie(res.cookies) : undefined,
      ...res.headers,
    },
  };
};
