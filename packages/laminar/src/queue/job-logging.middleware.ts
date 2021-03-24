import { toErrorMetadata } from '../errors';
import { withStaticMetadata, LoggerContext, LoggerLike } from '../logger';
import { WorkerMiddleware } from './types';

/**
 * A middleware that logs a successful worker run, as well as any worker errors.
 * Also adds `queue`, `traceToken` and `jobId` to the logger metadata
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 *
 * @category queue
 */
export function jobLoggingMiddleware(source: LoggerLike): WorkerMiddleware<LoggerContext> {
  return (next) => async (ctx) => {
    const data = ctx.data as Record<string, unknown> | undefined;
    const logger = withStaticMetadata(source, {
      queue: ctx.name,
      jobId: ctx.id,
      ...(data?.traceToken ? { traceToken: data.traceToken } : {}),
    });

    try {
      const res = await next({ ...ctx, logger });
      logger.info(`Queue Worker Success`);
      return res;
    } catch (error) {
      logger.error(error.message, toErrorMetadata(error));
      throw error;
    }
  };
}
