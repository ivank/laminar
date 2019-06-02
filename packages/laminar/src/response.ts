import * as cookie from 'cookie';
import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import { Laminar, LaminarCookie, LaminarResponse, ResolverResponse } from './types';

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
  [Laminar]: true,
  status,
  headers: {
    'content-type': contentType(body),
    'content-length': body ? contentLength(body) : undefined,
    'set-cookie': cookies ? setCookie(cookies) : undefined,
    ...headers,
  },
  cookies,
  body,
});

export const isResponse = (res: ResolverResponse): res is LaminarResponse =>
  typeof res === 'object' && Laminar in res;

export const extendResponse = (res: ResolverResponse, extend: Partial<LaminarResponse>) => {
  const original = toResponse(res);
  return {
    ...original,
    ...extend,
    headers: { ...original.headers, ...extend.headers },
    cookies: { ...original.cookies, ...extend.cookies },
  };
};

export const toResponse = (res: ResolverResponse): LaminarResponse =>
  isResponse(res) ? res : response({ body: res });

export const message = (status: number, body: {} | string) => response({ status, body });

export const redirect = (url: string, partial?: Partial<LaminarResponse>) => {
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

export const file = (filename: string, partial?: Partial<LaminarResponse>) =>
  response({
    body: createReadStream(filename),
    headers: {
      'content-length': statSync(filename).size,
      ...(partial ? partial.headers : undefined),
    },
    ...partial,
  });

const contentType = (body: any) => {
  return body instanceof Readable || body instanceof Buffer
    ? 'application/octet-stream'
    : typeof body === 'object'
    ? 'application/json'
    : 'text/plain';
};

const contentLength = (body: any) =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

const setCookie = (cookies: { [key: string]: string | LaminarCookie }) =>
  Object.entries(cookies).map(([name, content]) => {
    if (typeof content === 'string') {
      return cookie.serialize(name, content);
    } else {
      const { value, ...options } = content;
      return cookie.serialize(name, value, options);
    }
  });

export const resolveBody = (body: LaminarResponse['body']) =>
  body instanceof Readable ||
  body instanceof Buffer ||
  typeof body === 'string' ||
  body === undefined
    ? body
    : JSON.stringify(body);
