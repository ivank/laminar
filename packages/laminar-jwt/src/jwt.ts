import {
  User,
  JWTSign,
  Session,
  JWTVerify,
  JWTData,
  RequestAuthInfo,
  RequestSign,
  VerifiedJWTData,
  VerifyJWTData,
} from './types';
import * as jsonwebtoken from 'jsonwebtoken';
import {
  HttpMiddleware,
  Empty,
  jsonUnauthorized,
  jsonBadRequest,
  HttpResponse,
  jsonForbidden,
  jsonInternalServerError,
  isSecurityOk,
  OapiSecurityResolver,
  Security,
  securityOk,
  Middleware,
} from '@ovotech/laminar';

const isJWTData = (data: VerifiedJWTData | string | null): data is JWTData => data !== null && typeof data === 'object';

const isUser = (data: JWTData): data is User => 'email' in data;

export const toMissing = (userScopes: string[], requiredScopes: string[]): string[] =>
  requiredScopes.filter((requiredScope) => !userScopes.find((userScope) => requiredScope === userScope));

export const verifyJWT: VerifyJWTData = (data, scopes = []) => {
  if (!isUser(data)) {
    return jsonUnauthorized({
      message:
        'Unauthorized. Authorization token malformed, needs to be an object like { email: "...", scopes: ["...","..."] }',
    });
  }
  const missingScopes = toMissing(data.scopes ?? [], scopes);
  if (missingScopes.length) {
    return jsonForbidden({
      message: `Unauthorized. User does not have required scopes: [${missingScopes.join(', ')}]`,
    });
  }
  return securityOk(data);
};

export const createSession = <TUser extends User = User>({ secret, options }: JWTSign, user: TUser): Session => {
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

export const verifyToken = async (
  { secret, options, verify = verifyJWT }: JWTVerify,
  token: string,
  scopes?: string[],
): Promise<Security<User> | HttpResponse> => {
  try {
    const data = await new Promise<VerifiedJWTData>((resolve, reject) =>
      jsonwebtoken.verify(token, secret, options, (err, data) => (err ? reject(err) : resolve(data))),
    );
    if (!isJWTData(data)) {
      return jsonUnauthorized({ message: 'Authorization token malformed, needs to be an jwt object' });
    }
    return verify(data, scopes);
  } catch (error) {
    if (error instanceof jsonwebtoken.TokenExpiredError) {
      return jsonForbidden({
        message: `Unauthorized. TokenExpiredError: ${error.message}`,
        expiredAt: error.expiredAt,
      });
    } else if (error instanceof jsonwebtoken.NotBeforeError) {
      return jsonForbidden({
        message: `Unauthorized. NotBeforeError: ${error.message}`,
        date: error.date,
      });
    } else if (error instanceof jsonwebtoken.JsonWebTokenError) {
      return jsonForbidden({
        message: `Unauthorized. JsonWebTokenError: ${error.message}`,
        inner: error.inner,
      });
    }

    return jsonInternalServerError({ message: error.message });
  }
};

export const verifyBearer = async (
  options: JWTVerify,
  authorization?: string,
  scopes?: string[],
): Promise<Security<User> | HttpResponse> => {
  if (!authorization) {
    return jsonBadRequest({ message: 'Authorization header missing' });
  }
  const token = authorization.match(/^Bearer (.*)$/)?.[1];
  if (!token) {
    return jsonUnauthorized(401, {
      message: 'Authorization header is invalid. Needs to be "Bearer ${token}"',
    });
  }

  return verifyToken(options, token, scopes);
};

export const authMiddleware = (options: JWTVerify): ((scopes?: string[]) => HttpMiddleware<RequestAuthInfo>) => (
  scopes,
) => (next) => async (req) => {
  const result = await verifyBearer(options, req.incommingMessage.headers.authorization, scopes);
  return isSecurityOk(result) ? next({ ...req, ...result }) : result;
};

export const jwtSecurityResolver = (options: JWTVerify): OapiSecurityResolver<Empty, User> => ({ headers, scopes }) =>
  verifyBearer(options, headers.authorization, scopes);

export const createSessionMiddleware = (options: JWTSign): Middleware<RequestSign> => (next) => async (req) =>
  next({ ...req, sign: (user) => createSession(options, user) });
