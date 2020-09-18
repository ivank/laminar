import { ResponseBody, Response, Component } from '../types';
import { URLSearchParams } from 'url';
import { response } from '../response';
import { HttpError } from '../HttpError';
import { Readable } from 'stream';

export interface ResponseParser {
  match: (contentType: string) => boolean;
  parse: (body: any) => ResponseBody;
}

export const jsonResponseParser: ResponseParser = {
  match: (contentType) => /^application\/([^\+\;]+\+)?json(\;.*)?/.test(contentType),
  parse: (body) => JSON.stringify(body),
};

export const formResponseParser: ResponseParser = {
  match: (contentType) => contentType === 'application/x-www-form-urlencoded',
  parse: (body) => new URLSearchParams(body).toString(),
};

export const defaultResponseParsers: ResponseParser[] = [jsonResponseParser, formResponseParser];

const contentLength = (body: unknown): number | undefined =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

export const parseResponse = (res: Response, parsers = defaultResponseParsers): Response => {
  const contentType = res.headers['content-type'] as string | undefined;
  const parser = parsers.find((parser) => parser.match(contentType ?? ''));
  const body = parser
    ? parser.parse(res.body)
    : res.body instanceof Readable || res.body instanceof Buffer
    ? res.body
    : String(res.body);

  return {
    ...res,
    headers: {
      ...res.headers,
      'content-length': res.headers['content-length'] ?? contentLength(body),
    },
    body,
  };
};

export const responseParserComponent = (parsers = defaultResponseParsers): Component => (
  next,
) => async (req) => {
  try {
    return parseResponse(await next(req), parsers);
  } catch (error) {
    return error instanceof HttpError
      ? response({ body: JSON.stringify(error.body), headers: error.headers, status: error.code })
      : response({ body: JSON.stringify({ message: error.message }), status: 500 });
  }
};
