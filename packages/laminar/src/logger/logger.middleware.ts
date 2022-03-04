import { LoggerLike, LoggerContext } from './types';
import { Middleware } from '../types';

/**
 * A generic logger middleware.
 * Can be used with any resolver funciton, like http listener or queue worker.
 *
 * ```typescript
 * const withLogger = loggerMiddleware(console);
 *
 * new HttpListener({
 *  listener: withLogger(async ({ logger }) => {
 *    logger.info('test');
 *  })
 * })
 * ```
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 *
 * @category logger
 */
export function loggerMiddleware<TLogger extends LoggerLike>(logger: TLogger): Middleware<LoggerContext<TLogger>> {
  return (next) => (ctx) => next({ ...ctx, logger });
}
