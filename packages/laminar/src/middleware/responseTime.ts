import { extendResponse } from '../response';
import { Middleware } from '../types';

export interface ResponseTimeConfig {
  header?: string;
}

export const defaultResponseTimeHeader = 'x-response-time';

export const createResponseTime = ({
  header = defaultResponseTimeHeader,
}: ResponseTimeConfig = {}): Middleware => next => {
  return async ctx => {
    const startAt = process.hrtime();
    const result = await next(ctx);
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    return extendResponse(result, { headers: { [header]: time.toFixed(3) } });
  };
};
