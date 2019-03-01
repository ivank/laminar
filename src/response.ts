import * as contentDisposition from 'content-disposition';
import * as cookie from 'cookie';
import { createReadStream, statSync } from 'fs';
import * as mime from 'mime-types';
import { extname } from 'path';
import { Readable } from 'stream';
import { Response } from './types';

export class LaminarResponse implements Response {
  readonly body: Response['body'];
  readonly type: Response['type'];
  readonly status: Response['status'];
  readonly cookies: Response['cookies'];
  readonly headers: Response['headers'];
  constructor({ type, body, status, headers }: Partial<Response>) {
    this.type = type ? type : body ? bodyType(body) : 'txt';
    this.status = status || 200;
    this.headers = headers || {};

    if (body instanceof Readable || body instanceof Buffer || typeof body === 'string') {
      this.body = body;
    } else if (typeof body === 'object') {
      this.body = JSON.stringify(body);
    }
  }
}
export const response = (partial: Partial<Response>) => new LaminarResponse(partial);
export const message = (status: number, body: {} | string) => response({ status, body });

export const redirect = (url: string, partial?: Partial<Response>) =>
  response({
    headers: { Location: url, ...(partial ? partial.headers : undefined) },
    type: 'text/plain; charset=utf-8',
    body: `Redirecting to ${url}.`,
    status: 302,
    ...partial,
  });

export const file = (filename: string, partial?: Partial<Response>) =>
  response({
    type: extname(filename),
    body: createReadStream(filename),
    headers: {
      'Content-Length': statSync(filename).size,
      ...(partial ? partial.headers : undefined),
    },
    ...partial,
  });

export const attachment = (filename: string, partial?: Partial<Response>) =>
  file(filename, {
    headers: {
      'Content-Disposition': contentDisposition(filename),
      ...(partial ? partial.headers : undefined),
    },
    ...partial,
  });

const bodyType = (body: Response['body']) => {
  return body instanceof Readable || body instanceof Buffer
    ? 'bin'
    : typeof body === 'object'
    ? 'json'
    : 'txt';
};

const contentLength = (body: Response['body']) =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

const setCookie = (cookies: { [key: string]: string }) =>
  Object.entries(cookies).map(([name, value]) => cookie.serialize(name, value));

export const resolveResponse = (res: Response) => {
  return {
    headers: {
      'Content-Type': mime.contentType(res.type),
      'Content-Length': res.body ? contentLength(res.body) : undefined,
      'Set-Cookie': res.cookies ? setCookie(res.cookies) : undefined,
      ...res.headers,
    },
    status: res.status,
    body: res.body,
  };
};
