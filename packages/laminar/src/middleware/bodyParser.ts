import { Context, Resolver } from '../types';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { URLSearchParams } from 'url';
import { message } from '../response';

export interface BodyParser {
  match: (contentType: string) => boolean;
  parse: (body: IncomingMessage) => Promise<unknown>;
}

export const concatStream = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
};

export const parseJson: BodyParser = {
  match: (contentType) => /^application\/([^\+\;]+\+)?json(\;.*)?/.test(contentType),
  parse: async (body) => JSON.parse(String(await concatStream(body))),
};

export const parseForm: BodyParser = {
  match: (contentType) => contentType === 'application/x-www-form-urlencoded',
  parse: async (body) => new URLSearchParams(String(await concatStream(body))),
};

export const parseText: BodyParser = {
  match: (contentType) => /^text\/.*/.test(contentType),
  parse: async (body) => String(await concatStream(body)),
};

export const defaultParsers = [parseJson, parseForm, parseText];

export const parseBody = async (body: IncomingMessage, parsers: BodyParser[]): Promise<unknown> => {
  const parser = parsers.find((parser) => parser.match(body.headers['content-type'] || ''));

  return parser ? parser.parse(body) : body;
};

export const createBodyParser = (parsers: BodyParser[] = defaultParsers) => (
  next: Resolver<Context>,
): Resolver<Context> => async (ctx) => {
  try {
    const body = await parseBody(ctx.body, parsers);
    return next({ ...ctx, body });
  } catch (error) {
    return message(400, { message: `Error parsing request body`, error: error.message });
  }
};
