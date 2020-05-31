import { Context, Middleware, ResolverResponse, LaminarResponseBody } from '../types';
import { format } from 'url';
import { isResponse } from '../response';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';

export interface Metadata {
  [key: string]: unknown;
}

export interface Logger {
  log: (level: string, message: string, metadata?: Metadata) => void;
}

export interface LoggingContext<TLogger extends Logger = Logger> {
  logger: TLogger;
}

export interface LoggerOptions {
  request?: (ctx: Context) => Metadata;
  response?: (response: ResolverResponse) => Metadata;
  error?: (error: Error) => Metadata;
}
export const formatResponseBody = (
  body: LaminarResponseBody | undefined,
  // eslint-disable-next-line @typescript-eslint/ban-types
): string | object | undefined =>
  Buffer.isBuffer(body) ? '[Buffer]' : body instanceof Readable ? '[Readable]' : body;

export const defaultOptions: LoggerOptions = {
  request: (ctx) => ({
    uri: `${ctx.method} ${format(ctx.url)}`,
    body: ctx.body instanceof IncomingMessage ? '[Stream]' : ctx.body,
  }),
  response: (response) => ({
    ...(isResponse(response)
      ? { status: response.status, body: formatResponseBody(response.body) }
      : { status: 200, body: formatResponseBody(response) }),
  }),
  error: (error) => ({ message: error.message, stack: error.stack }),
};

export const createLogging = <TLogger extends Logger>(
  logger: TLogger,
  userOptions: Partial<LoggerOptions> = {},
): Middleware<LoggingContext<TLogger>> => (next) => async (ctx) => {
  const options = { ...defaultOptions, ...userOptions };

  try {
    if (options.request) {
      logger.log('info', 'Request', options.request(ctx));
    }
    const response = await next({ ...ctx, logger });
    if (options.response) {
      logger.log('info', 'Response', options.response(response));
    }

    return response;
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    if (options.error) {
      logger.log('error', 'Error', options.error(error));
    }
    throw error;
  }
};
