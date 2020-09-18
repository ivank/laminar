import { Component } from '../types';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import { URLSearchParams } from 'url';
import { jsonBadRequest } from '../response';

export interface BodyParser {
  match: (contentType: string) => boolean;
  parse: (body: IncomingMessage) => Promise<unknown>;
}

export interface RequestBody {
  body: any;
}

export const concatStream = async (stream: Readable): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(chunks.length ? String(Buffer.concat(chunks)) : undefined))
      .on('error', reject);
  });
};

export const parseJson: BodyParser = {
  match: (contentType) => /^application\/([^\+\;]+\+)?json(\;.*)?/.test(contentType),
  parse: async (incommingMessage) => {
    const buffer = await concatStream(incommingMessage);
    return buffer === undefined ? undefined : JSON.parse(buffer);
  },
};

export const parseForm: BodyParser = {
  match: (contentType) => contentType === 'application/x-www-form-urlencoded',
  parse: async (incommingMessage) =>
    new URLSearchParams((await concatStream(incommingMessage)) ?? ''),
};

export const parseText: BodyParser = {
  match: (contentType) => /^text\/.*/.test(contentType),
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const defaultBodyParsers: BodyParser[] = [parseJson, parseForm, parseText];

export const parseBody = async (
  incommingMessage: IncomingMessage,
  parsers = defaultBodyParsers,
): Promise<unknown> => {
  const parser = parsers.find((parser) =>
    parser.match(incommingMessage.headers['content-type'] || ''),
  );

  return parser ? await parser.parse(incommingMessage) : incommingMessage;
};

export const bodyParserComponent = (parsers = defaultBodyParsers): Component<RequestBody> => (
  next,
) => async (req) => {
  try {
    const body = await parseBody(req.incommingMessage, parsers);
    return next({ ...req, body });
  } catch (error) {
    return jsonBadRequest({ message: `Error parsing request body`, error: error.message });
  }
};
