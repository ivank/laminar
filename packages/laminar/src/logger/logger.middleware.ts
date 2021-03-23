import { LoggerLike, LoggerContext } from './types';
import { Middleware } from '../types';

/**
 * A generic logger middleware.
 * Can be used with any resolver funciton, like http listener or queue worker.
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export function loggerMiddleware(logger: LoggerLike): Middleware<LoggerContext> {
  return (next) => (ctx) => next({ ...ctx, logger });
}
