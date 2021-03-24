import { HttpMiddleware } from '../types';

/**
 * Configuration of {@link responseTimeMiddleware}
 *
 * @category http
 */
export interface ResponseTimeConfig {
  header?: string;
}

/**
 * The default header used by {@link responseTimeMiddleware}
 *
 * @category http
 */
export const defaultResponseTimeHeader = 'x-response-time';

/**
 * Track response time of a response
 *
 * @category http
 */
export function responseTimeMiddleware({
  header = defaultResponseTimeHeader,
}: ResponseTimeConfig = {}): HttpMiddleware {
  return (next) => {
    return async (ctx) => {
      const startAt = process.hrtime();
      const result = await next(ctx);
      const diff = process.hrtime(startAt);
      const time = diff[0] * 1e3 + diff[1] * 1e-6;
      return { ...result, headers: { ...result.headers, [header]: time.toFixed(3) } };
    };
  };
}
