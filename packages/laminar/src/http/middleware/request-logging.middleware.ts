import { toErrorMetadata } from '../../errors';
import { withStaticMetadata, LoggerContext, LoggerLike } from '../../logger';
import { isHttpError } from '../http-error';
import { HttpContext, HttpMiddleware } from '../types';

export interface RequestLoggingMiddlewareParams {
  /**
   * If present, will filter requests coming in from logging.
   * Only ones that return true will be logged.
   *
   * Errors are still logged either way.
   */
  filter?: (ctx: HttpContext) => boolean;
}

/**
 * A middleware to log the response of a request, as well as any errors
 *
 * @param logger a loggeer instancee that must implement the {@link LoggerLike} interface.
 *
 * @category http
 */
export function requestLoggingMiddleware<TLogger extends LoggerLike>(
  source: TLogger,
  { filter }: RequestLoggingMiddlewareParams = {},
): HttpMiddleware<LoggerContext<TLogger>> {
  return (next) => async (ctx) => {
    const logger = withStaticMetadata(source, {
      request: `${ctx.method} ${ctx.url.pathname}`,
      ...(ctx.headers['x-trace-token'] ? { traceToken: ctx.headers['x-trace-token'] } : {}),
    });

    try {
      const res = await next({ ...ctx, logger });
      if (!filter || filter(ctx)) {
        if (res.status >= 200 && res.status < 500) {
          logger.info(`${ctx.method} ${ctx.url.pathname}: ${res.status}`, { status: res.status });
        } else {
          logger.error(`${ctx.method} ${ctx.url.pathname}: ${res.status}`, { status: res.status, body: res.body });
        }
      }
      return res;
    } catch (error) {
      if (error instanceof Error) {
        if (isHttpError(error) && error.code < 500) {
          logger.info(error.message, toErrorMetadata(error));
        } else {
          logger.error(error.message, toErrorMetadata(error));
        }
      } else {
        logger.error(String(error));
      }
      throw error;
    }
  };
}
