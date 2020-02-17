import * as cookie from 'cookie';
import { createReadStream, statSync } from 'fs';
import { lookup } from 'mime-types';
import { Readable } from 'stream';
import { LaminarObject, LaminarCookie, LaminarResponse, ResolverResponse } from './types';

const contentType = (body: unknown): string => {
  return body instanceof Readable || body instanceof Buffer
    ? 'application/octet-stream'
    : typeof body === 'object'
    ? 'application/json'
    : 'text/plain';
};

const contentLength = (body: unknown): number | undefined =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

const setCookie = (cookies: { [key: string]: string | LaminarCookie }): string[] =>
  Object.entries(cookies).map(([name, content]) => {
    if (typeof content === 'string') {
      return cookie.serialize(name, content);
    } else {
      const { value, ...options } = content;
      return cookie.serialize(name, value, options);
    }
  });

export const response = <TBody = LaminarResponse['body']>({
  body,
  status = 200,
  headers = {},
  cookies,
}: {
  status?: number;
  body?: TBody;
  headers?: LaminarResponse['headers'];
  cookies?: LaminarResponse['cookies'];
}): LaminarResponse<TBody> => ({
  [LaminarObject]: true,
  status,
  headers: {
    'content-type': contentType(body),
    ...(body ? { 'content-length': contentLength(body) } : undefined),
    ...(cookies ? { 'set-cookie': setCookie(cookies) } : undefined),
    ...headers,
  },
  cookies,
  body,
});

export const isResponse = (res: ResolverResponse): res is LaminarResponse =>
  typeof res === 'object' && LaminarObject in res;

export const toResponse = (res: ResolverResponse): LaminarResponse =>
  isResponse(res) ? res : response({ body: res });

export const extendResponse = (
  res: ResolverResponse,
  extend: Partial<LaminarResponse>,
): LaminarResponse => {
  const original = toResponse(res);
  return {
    ...original,
    ...extend,
    headers: { ...original.headers, ...extend.headers },
    cookies: { ...original.cookies, ...extend.cookies },
  };
};

export const message = <T = object | string>(status: number, body: T): LaminarResponse<T> =>
  response<T>({ status, body });

export const redirect = (url: string, partial?: Partial<LaminarResponse>): LaminarResponse => {
  const { headers, ...rest } = partial || { headers: {} };
  return response({
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      location: url,
      ...headers,
    },
    body: `Redirecting to ${url}.`,
    status: 302,
    ...rest,
  });
};

export const file = (filename: string, partial?: Partial<LaminarResponse>): LaminarResponse =>
  response({
    body: createReadStream(filename),
    headers: {
      'content-type': lookup(filename) || 'text/plain',
      'content-length': statSync(filename).size,
      ...partial?.headers,
    },
    ...partial,
  });

export const resolveBody = (
  body: LaminarResponse['body'],
): string | Readable | Buffer | undefined =>
  body instanceof Readable ||
  body instanceof Buffer ||
  typeof body === 'string' ||
  body === undefined
    ? body
    : JSON.stringify(body);
