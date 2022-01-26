import { User, JWTSign, Session, JWTVerify, JWTData, RequestAuthInfo, RequestSign } from './types';
import jsonwebtoken from 'jsonwebtoken';
import {
  HttpMiddleware,
  Empty,
  isSecurityOk,
  OapiSecurityResolver,
  Security,
  securityOk,
  Middleware,
  securityError,
  HttpError,
} from '@ovotech/laminar';

const isJWTData = (data: jsonwebtoken.JwtPayload | string | null): data is JWTData =>
  data !== null && typeof data === 'object';

const isUser = <TUser extends User = User>(data: JWTData): data is TUser => typeof data === 'object' && data !== null;

export const toMissing = (userScopes: string[], requiredScopes: string[]): string[] =>
  requiredScopes.filter((requiredScope) => !userScopes.find((userScope) => requiredScope === userScope));

export const verifyJWT = <TUser extends User = User>(data: JWTData, scopes: string[] = []): Security<TUser> => {
  if (!isUser<TUser>(data)) {
    return securityError({
      message:
        'Unauthorized. Authorization token malformed, needs to be an object like { email: "...", scopes: ["...","..."] }',
    });
  }
  const missingScopes = toMissing(data.scopes ?? [], scopes);
  if (missingScopes.length) {
    return securityError({
      message: `Unauthorized. User does not have required scopes: [${missingScopes.join(', ')}]`,
    });
  }
  return securityOk<TUser>(data);
};

export const createSession = <TUser extends User = User>({ secret, options }: JWTSign, user: TUser): Session<TUser> => {
  const jwt = jsonwebtoken.sign(user, secret, options);
  const data = jsonwebtoken.decode(jwt);
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

export const verifyToken = async <TUser extends User>(
  { secret, options, verify = verifyJWT }: JWTVerify<TUser>,
  token: string,
  scopes?: string[],
): Promise<Security<TUser>> => {
  try {
    const data = await new Promise<jsonwebtoken.JwtPayload | string>((resolve, reject) =>
      jsonwebtoken.verify(token, secret, options, (err, data) =>
        err ? reject(err) : data ? resolve(data) : reject(new Error('Invalid jwt data')),
      ),
    );
    if (!isJWTData(data)) {
      return securityError({ message: 'Authorization token malformed, needs to be an jwt object' });
    }
    return verify(data, scopes);
  } catch (error) {
    if (error instanceof jsonwebtoken.TokenExpiredError) {
      return securityError({
        message: `Unauthorized. TokenExpiredError: ${error.message}`,
        expiredAt: error.expiredAt,
      });
    } else if (error instanceof jsonwebtoken.NotBeforeError) {
      return securityError({
        message: `Unauthorized. NotBeforeError: ${error.message}`,
        date: error.date,
      });
    } else if (error instanceof jsonwebtoken.JsonWebTokenError) {
      return securityError({
        message: `Unauthorized. JsonWebTokenError: ${error.message}`,
        inner: error.inner,
      });
    }

    return new HttpError(500, error instanceof Error ? { message: error.message } : { message: String(error) });
  }
};

export const verifyBearer = async <TUser extends User>(
  options: JWTVerify<TUser>,
  authorization?: string,
  scopes?: string[],
): Promise<Security<TUser>> => {
  if (!authorization) {
    return securityError({ message: 'Authorization header missing' });
  }
  const token = authorization.match(/^Bearer (.*)$/)?.[1];
  if (!token) {
    return securityError({ message: 'Authorization header is invalid. Needs to be "Bearer ${token}"' });
  }

  return verifyToken(options, token, scopes);
};

export const authMiddleware =
  (options: JWTVerify): ((scopes?: string[]) => HttpMiddleware<RequestAuthInfo>) =>
  (scopes) =>
  (next) =>
  async (req) => {
    const result = await verifyBearer(options, req.incommingMessage.headers.authorization, scopes);
    if (isSecurityOk(result)) {
      return next({ ...req, ...result });
    } else {
      throw result;
    }
  };

export const jwtSecurityResolver =
  <TUser extends User = User>(options: JWTVerify<TUser>): OapiSecurityResolver<Empty, TUser> =>
  ({ headers, scopes }) =>
    verifyBearer(options, headers.authorization, scopes);

export const createSessionMiddleware =
  (options: JWTSign): Middleware<RequestSign> =>
  (next) =>
  async (req) =>
    next({ ...req, sign: (user) => createSession(options, user) });
