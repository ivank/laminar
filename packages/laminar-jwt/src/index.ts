import { Middleware } from '@ovotech/laminar';
import { sign, verify, decode, SignOptions, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import { JWTAuthenticationError } from './JWTAuthenticationError';
import { OapiSecurityResolver } from '@ovotech/laminar-oapi';

export interface JWTData {
  email: string;
  scopes?: string[];
  iat?: number;
  nbf?: number;
  exp?: number;
  [key: string]: unknown;
}

interface User {
  email: string;
  scopes?: string[];
}

interface Session<TUser extends User = User> {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: TUser;
}

export interface JWTContext<TUser extends User = User> {
  verifyAuthorization: (header?: string, scopes?: string[]) => JWTData;
  createSession: (user: TUser, options?: SignOptions) => Session<TUser>;
  authInfo?: JWTData;
}

export interface JWTContextAuthenticated<TUser extends User = User> extends JWTContext<TUser> {
  authInfo: JWTData;
}

export const isJWTData = (data: object | string | null): data is JWTData =>
  data !== null && typeof data === 'object' && 'email' in data;

export const jwtVerifyAuthorization = (
  apiSecretKey: string,
  header?: string,
  scopes?: string[],
): JWTData => {
  if (!header) {
    throw new JWTAuthenticationError(401, { message: 'Authorization header missing' });
  }
  const match = header.match(/^Bearer (.*)$/);
  if (!match) {
    throw new JWTAuthenticationError(401, {
      message: 'Authorization header is invalid. Needs to be "Bearer ${token}"',
    });
  }

  try {
    const data = verify(match[1], apiSecretKey);

    if (!isJWTData(data)) {
      throw new JWTAuthenticationError(401, {
        message: 'Authorization token malformed, needs to be object data',
      });
    }

    if (scopes) {
      const missingScopes = scopes.filter(
        requiredScope =>
          !data.scopes || !data.scopes.find(userScope => requiredScope === userScope),
      );

      if (missingScopes.length !== 0) {
        throw new JWTAuthenticationError(401, {
          message: `Authorization error. User does not have required scopes: [${missingScopes.join(
            ', ',
          )}]`,
        });
      }
    }

    return data;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new JWTAuthenticationError(401, {
        message: `Authorization error. ${error.message}`,
        expiredAt: error.expiredAt,
      });
    } else if (error instanceof NotBeforeError) {
      throw new JWTAuthenticationError(401, {
        message: `Authorization error. ${error.message}`,
        date: error.date,
      });
    }

    throw error;
  }
};

export const jwtCreateSession = <TUser extends User = User>(
  apiSecretKey: string,
  user: TUser,
  options?: SignOptions,
): Session<TUser> => {
  const jwtData: JWTData = {
    email: user.email,
    scopes: user.scopes,
  };

  const jwt = sign(jwtData, apiSecretKey, options);
  const data = decode(jwt);
  if (!isJWTData(data)) {
    throw new Error('Error generating token, could not extract exp & nbf');
  }

  const { exp, nbf } = data;
  return {
    jwt,
    user,
    ...(exp ? { expiresAt: new Date(1000 * exp).toISOString() } : undefined),
    ...(nbf ? { notBefore: new Date(1000 * nbf).toISOString() } : undefined),
  };
};

export const createJwtSecurity = <TUser extends User = User>(
  apiSecretKey: string,
): Middleware<JWTContext<TUser>> => {
  const jwtContext: JWTContext<TUser> = {
    verifyAuthorization: (header, scopes) => jwtVerifyAuthorization(apiSecretKey, header, scopes),
    createSession: (user, options) => jwtCreateSession(apiSecretKey, user, options),
  };

  return next => ctx => next({ ...ctx, ...jwtContext });
};

export const auth = (
  scopes?: string[],
): Middleware<JWTContextAuthenticated, JWTContext> => next => ctx => {
  const authInfo = ctx.verifyAuthorization(ctx.headers.authorization, scopes);
  return next({ ...ctx, authInfo });
};

export const JWTSecurity: OapiSecurityResolver<JWTContext> = (
  { headers, verifyAuthorization },
  { scopes },
) => verifyAuthorization(headers.authorization, scopes);
