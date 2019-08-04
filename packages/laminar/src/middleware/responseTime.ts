import { extendResponse, Middleware } from '..';

export interface ResponseTimeConfig {
  header?: string;
}

export const withResponseTime = ({ header }: ResponseTimeConfig = {}): Middleware => next => {
  const startAt = process.hrtime();
  const headerName = header || 'X-Response-Time';

  return async ctx => {
    const result = await next(ctx);
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    return extendResponse(result, { headers: { [headerName]: time.toFixed(3) } });
  };
};
