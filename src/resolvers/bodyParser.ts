import { concatStream } from '../helpers/concatStream';
import { Middleware } from '../types';

export interface WithBody {
  body: {} | null;
}

export const bodyParser: Middleware<WithBody> = resolver => {
  return async ctx => {
    const body = await concatStream(ctx.request);
    return resolver({ ...ctx, body: body ? JSON.parse(body) : null });
  };
};
