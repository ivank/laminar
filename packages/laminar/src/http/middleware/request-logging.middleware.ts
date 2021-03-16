import { toErrorMetadata } from '../../errors';
import { withStaticMetadata, LoggerContext, LoggerLike } from '../../logger';
import { HttpMiddleware } from '../types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const requestLoggingMiddleware = (source: LoggerLike): HttpMiddleware<LoggerContext> => (next) => async (
  ctx,
) => {
  const logger = withStaticMetadata(source, {
    request: `${ctx.method} ${ctx.url.pathname}`,
    ...(ctx.headers['x-trace-token'] ? { traceToken: ctx.headers['x-trace-token'] } : {}),
  });

  try {
    const res = await next({ ...ctx, logger });
    if (res.status >= 200 && res.status < 300) {
      logger.info(`Status: ${res.status}`);
    } else {
      logger.error(`Status: ${res.status}`, { body: res.body });
    }
    return res;
  } catch (error) {
    logger.error(error.message, toErrorMetadata(error));
    throw error;
  }
};
