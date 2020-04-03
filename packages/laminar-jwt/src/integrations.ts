import { Middleware } from '@ovotech/laminar';
import { JWTContextAuthenticated, JWTContext } from './types';
import { OapiSecurityResolver } from '@ovotech/laminar-oapi';

export const auth = (scopes?: string[]): Middleware<JWTContextAuthenticated, JWTContext> => (
  next,
) => async (ctx) => {
  const authInfo = await ctx.verifyAuthorization(ctx.headers.authorization, scopes);
  return next({ ...ctx, authInfo });
};

export const JWTSecurity: OapiSecurityResolver<JWTContext> = (
  { headers, verifyAuthorization },
  { scopes },
) => verifyAuthorization(headers.authorization, scopes);
