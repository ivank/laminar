/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '../types';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { URLSearchParams } from 'url';
import { parseQueryObjects } from '../helpers';

export interface BodyParser {
  /**
   * If returns true for a given content type, then this body parser will be used
   */
  match: (contentType: string) => boolean;
  /**
   * Process a raw incomming message into a concrete parsed response
   */
  parse: (body: IncomingMessage) => Promise<unknown>;
}

/**
 * Request parameters added by the {@link bodyParserComponent}
 */
export interface RequestBody {
  /**
   * The parsed body of the request. Parsed using the provided body parsers.
   *
   * Supported:
   *  - text
   *  - json
   *  - url encoded
   *
   * You can add additional parser / modify existing ones
   */
  body: any;
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

const parseJsonRegExp = /^application\/([^\+\;]+\+)?json(\;.*)?/;
const parseFormRegExp = /^application\/x-www-form-urlencoded(\;.*)?/;

export const parseJson: BodyParser = {
  match: (contentType) => parseJsonRegExp.test(contentType),
  parse: async (incommingMessage) => {
    const buffer = await concatStream(incommingMessage);
    return buffer === undefined ? undefined : JSON.parse(buffer);
  },
};

export const parseForm: BodyParser = {
  match: (contentType) => parseFormRegExp.test(contentType),
  parse: async (incommingMessage) =>
    parseQueryObjects(new URLSearchParams((await concatStream(incommingMessage)) ?? '')),
};

const parseTextRegx = /^text\/.*/;

export const parseText: BodyParser = {
  match: (contentType) => parseTextRegx.test(contentType),
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const parseDefault: BodyParser = {
  match: () => true,
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const defaultBodyParsers: BodyParser[] = [parseJson, parseForm, parseText, parseDefault];

export async function parseBody(incommingMessage: IncomingMessage, parsers = defaultBodyParsers): Promise<unknown> {
  const parser = parsers.find((parser) => parser.match(incommingMessage.headers['content-type'] || ''));

  return parser ? await parser.parse(incommingMessage) : incommingMessage;
}

/**
 * Parse the incommingMessage request into a javascript object
 *
 * Supports contentTypes by default for:
 *
 *  - json
 *  - url encoded
 *  - text content
 *
 * @param parsers replace with custom parsers, can use [...defaultBodyParsers, newParser] to add
 *
 * @category component
 */
export function bodyParserComponent(parsers = defaultBodyParsers): Component<RequestBody> {
  return (next) => async (req) => next({ ...req, body: await parseBody(req.incommingMessage, parsers) });
}
