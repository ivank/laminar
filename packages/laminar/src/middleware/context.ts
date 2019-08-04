import { Middleware, Context } from '../types';

export const withContext: Middleware<{}, Context> = next => ctx => next(ctx);
