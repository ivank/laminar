import { toErrorMetadata } from '../../errors';
import { withStaticMetadata, LoggerContext, LoggerLike } from '../../logger';
import { HttpMiddleware } from '../types';

/**
 * A middleware to log the response of a request, as well as any errors
 *
 * @param logger a loggeer instancee that must implement the {@link LoggerLike} interface.
 *
 * @category http
 */
export function requestLoggingMiddleware(source: LoggerLike): HttpMiddleware<LoggerContext> {
  return (next) => async (ctx) => {
    const logger = withStaticMetadata(source, {
      request: `${ctx.method} ${ctx.url.pathname}`,
      ...(ctx.headers['x-trace-token'] ? { traceToken: ctx.headers['x-trace-token'] } : {}),
    });

    try {
      const res = await next({ ...ctx, logger });
      if (res.status >= 200 && res.status < 300) {
        logger.info(`${ctx.method} ${ctx.url.pathname}: ${res.status}`, { status: res.status });
      } else {
        logger.error(`${ctx.method} ${ctx.url.pathname}: ${res.status}`, { status: res.status, body: res.body });
      }
      return res;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message, toErrorMetadata(error));
      } else {
        logger.error(String(error));
      }
      throw error;
    }
  };
}
