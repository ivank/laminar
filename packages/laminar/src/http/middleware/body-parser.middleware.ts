import { IncomingMessage } from 'http';
import { URLSearchParams } from 'url';
import { parseQueryObjects } from '../../helpers';
import { HttpMiddleware } from '../types';
import { Readable } from 'stream';
import { toMultipartBoundary, MultipartParser, toMultipartData } from '../multipart-parser';
import { HttpError } from '../http-error';

/**
 * @category http
 */
export interface BodyParser {
  /**
   * The name of the parseer, for debugging purposes
   */
  name: string;
  /**
   * If returns true for a given content type, then this body parser will be used
   */
  match: RegExp | ((contentType: string) => boolean);
  /**
   * Process a raw incoming message into a concrete parsed response
   */
  parse: (body: IncomingMessage) => Promise<unknown>;
}

/**
 * Convert a stream of text data into a single string. If there were no chunks in the stream, return undefined
 */
export function concatStream(stream: Readable): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(chunks.length ? String(Buffer.concat(chunks)) : undefined))
      .on('error', reject);
  });
}

/**
 * Http body parser for json requests
 *
 * @category http
 */
export const parseJson: BodyParser = {
  name: 'JsonBodyParser',
  match: /^application\/([^\+\;]+\+)?json(\;.*)?/,
  parse: async (incomingMessage) => {
    const buffer = await concatStream(incomingMessage);
    return buffer === undefined ? undefined : JSON.parse(buffer);
  },
};

/**
 * Http body parser for url encoded requests (http forms)
 *
 * @category http
 */
export const parseForm: BodyParser = {
  name: 'FormUrlEncodedBodyParser',
  match: /^application\/x-www-form-urlencoded(\;.*)?/,
  parse: async (incomingMessage) => parseQueryObjects(new URLSearchParams((await concatStream(incomingMessage)) ?? '')),
};

/**
 * Http body parser for plain text requests
 *
 * @category http
 */
export const parseText: BodyParser = {
  name: 'PlainTextBodyParser',
  match: /^text\/.*/,
  parse: async (incomingMessage) => await concatStream(incomingMessage),
};

/**
 * Http body parser for multipart form data requests
 *
 * @category http
 */
export const multipartFormData: BodyParser = {
  name: 'MultipartFormDataBodyParser',
  match: /^multipart\/form-data/,
  parse: async (incomingMessage) => {
    const contentType = incomingMessage.headers['content-type'];
    const boundary = toMultipartBoundary(contentType);
    if (!boundary) {
      throw new Error(`Missing boundary in Content-Type header: ${contentType}`);
    }
    const parser = new MultipartParser(boundary);
    return await toMultipartData(incomingMessage.pipe(parser));
  },
};

/**
 * Http body parser for anything, just concatenates the stream
 *
 * @category http
 */
export const parseDefault: BodyParser = {
  name: 'DefaultParser',
  match: () => true,
  parse: async (incomingMessage) => await concatStream(incomingMessage),
};

export const defaultBodyParsers: BodyParser[] = [parseJson, parseForm, parseText, multipartFormData, parseDefault];

export async function parseBody(incomingMessage: IncomingMessage, parsers = defaultBodyParsers): Promise<unknown> {
  const parser = parsers.find((parser) => {
    const contentType = incomingMessage.headers['content-type'] || '';
    return parser.match instanceof RegExp ? parser.match.test(contentType) : parser.match(contentType);
  });

  return parser
    ? await parser.parse(incomingMessage).catch((error) => {
        throw new HttpError(400, {
          message: `Error Parsing Request Body: "${error.message}" with parser: ${parser.name}`,
        });
      })
    : incomingMessage;
}

/**
 * Parse the incomingMessage request into a javascript object
 *
 * Supports contentTypes by default for:
 *
 *  - json
 *  - url encoded
 *  - text content
 *
 * @param parsers replace with custom parsers, can use [...defaultBodyParsers, newParser] to add
 *
 * @category http
 */
export function bodyParserMiddleware(parsers = defaultBodyParsers): HttpMiddleware {
  return (next) => async (ctx) => next({ ...ctx, body: await parseBody(ctx.incomingMessage, parsers) });
}
