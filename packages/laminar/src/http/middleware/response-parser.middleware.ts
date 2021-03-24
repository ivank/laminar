/* eslint-disable @typescript-eslint/no-explicit-any */
import { URLSearchParams } from 'url';
import { Readable } from 'stream';
import { HttpMiddleware, HttpResponseBody, HttpResponse } from '../types';

/**
 * Convert a response body into a string / buffer / readable stream
 *
 * @category http
 */
export interface ResponseParser {
  /**
   * If returns true for a given content type, this parser will be used
   */
  match: (contentType: string) => boolean;
  parse: (body: any) => HttpResponseBody;
}

/**
 * A regex for {@link jsonResponseParser} to find if the response object is a json.
 *
 * @category http
 */
const jsonResponseParserRegex = /^application\/([^\+\;]+\+)?json(\;.*)?/;

/**
 * @category http
 */
export const jsonResponseParser: ResponseParser = {
  match: (contentType) => jsonResponseParserRegex.test(contentType),
  parse: (body) => JSON.stringify(body),
};

/**
 * @category http
 */
export const formResponseParser: ResponseParser = {
  match: (contentType) => contentType === 'application/x-www-form-urlencoded',
  parse: (body) => new URLSearchParams(body).toString(),
};

/**
 * @category http
 */
export const defaultResponseParsers: ResponseParser[] = [jsonResponseParser, formResponseParser];

/**
 * Get the content length of buffer or string. Return undefined otherwise.
 *
 * @category http
 */
const toContentLength = (body: unknown): number | undefined =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

/**
 * Parse the body of {@link HttpResponse}, using content-type header and a list of parsers.
 * Conver it to a suitable string representation
 *
 * @category http
 */
export function parseResponse(res: HttpResponse, parsers = defaultResponseParsers): HttpResponse {
  const contentType = res.headers['content-type'] as string | undefined;
  const parser = parsers.find((parser) => parser.match(contentType ?? ''));
  const body = parser
    ? parser.parse(res.body)
    : res.body instanceof Readable || res.body instanceof Buffer
    ? res.body
    : String(res.body);

  const contentLength = res.headers['content-length'] ?? toContentLength(body);

  return { ...res, body, headers: { ...res.headers, 'content-length': contentLength } };
}

/**
 * Parse the response body using the provided parsers.
 * By default support
 *
 *  - json
 *  - url encoded form data
 *
 * @param parsers
 *
 * @category http
 */
export function responseParserMiddleware(parsers = defaultResponseParsers): HttpMiddleware {
  return (next) => async (ctx) => parseResponse(await next(ctx), parsers);
}
