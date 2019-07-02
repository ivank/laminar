import { Middleware } from '..';
import { Context } from '../types';

export interface Metadata {
  [key: string]: any;
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
): Middleware<LoggerContext> => resolver => async ctx => {
  try {
    return await resolver({ ...ctx, logger });
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    logger.log('error', error.message, metadata(error, ctx));
    throw error;
  }
};
