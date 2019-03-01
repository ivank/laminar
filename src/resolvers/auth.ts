import { Middleware } from '../types';

export interface WithAuth {
  authInfo: {};
}

export const auth: Middleware<WithAuth> = resolver => {
  return async ctx => {
    return resolver({ ...ctx, authInfo: { user: 123 } });
  };
};
