import { Empty, Middleware } from '../types';

/**
 * A generic middleware that will just pass any params into the context of the function execution.
 *
 * ```typescript
 * const myCtx = { testDate: new Date() };
 *
 * const withTestDate = passThroughMiddleware(myCtx);
 *
 * new HttpListener({
 *  listener: withTestDate(async ({ testDate }) => {
 *    console.log(testDate);
 *  })
 * })
 * ```
 *
 * @typeParam TPassThroughContext pass through all the params of the context as is.
 * @param pass pass through all the params of the context as is.
 */
export function passThroughMiddleware<TPassThroughContext extends Empty>(
  pass: TPassThroughContext,
): Middleware<TPassThroughContext> {
  return (next) => (ctx) => next({ ...ctx, ...pass });
}
