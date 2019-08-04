import { Middleware, Context } from '../types';

export const withContext: Middleware<{}, Context> = resolver => ctx => resolver(ctx);
