import { Middleware, Context } from '@ovotech/laminar';

export type LoggerFunc = (message: string) => void;
export interface LoggerContext {
  logger: LoggerFunc;
}

export const withLogger = (func: LoggerFunc): Middleware<LoggerContext, Context> => (
  resolver,
) => async (ctx) => await resolver({ ...ctx, logger: func });
