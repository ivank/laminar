import { Context, Middleware } from '../types';

export interface Metadata {
  [key: string]: unknown;
}

export interface Logger {
  log: (level: string, message: string, metadata?: Metadata) => void;
}

export interface LoggerContext {
  logger: Logger;
}

export type ContextErrorMetadata = (error: Error, ctx: Context) => Metadata;

export const defaultMetadata: ContextErrorMetadata = (error, ctx) => ({
  error,
  path: ctx.url.path,
  method: ctx.method,
});

export const withLogger = (
  logger: Logger = console,
  metadata: ContextErrorMetadata = defaultMetadata,
): Middleware<LoggerContext, Context> => next => async ctx => {
  try {
    return await next({ ...ctx, logger });
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    logger.log('error', error.message, metadata(error, ctx));
    throw error;
  }
};
