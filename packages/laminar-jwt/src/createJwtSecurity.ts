import { SignOptions, VerifyOptions, GetPublicKeyOrSecret, Secret } from 'jsonwebtoken';
import { User, JWTContext, JWTData } from './types';
import { Middleware } from '@ovotech/laminar';
import { jwtVerifyAuthorization } from './jwtVerifyAuthorization';
import { jwtCreateSession } from './jwtCreateSession';
import { JWTAuthenticationError } from './JWTAuthenticationError';

export type ValidateJwtData<T extends JWTData = JWTData> = (data: T, scopes?: string[]) => void;

export interface JWTDataKeycloak extends JWTData {
  resource_access?: { [key: string]: { roles: string[] } };
}

export type JwtSecurityOptions =
  | {
      secret: string;
      signOptions?: SignOptions;
      verifyOptions?: VerifyOptions;
      validateScopes?: ValidateJwtData;
    }
  | {
      publicKey?: string | Buffer | GetPublicKeyOrSecret;
      privateKey?: Secret;
      signOptions?: SignOptions;
      verifyOptions?: VerifyOptions;
      validateScopes?: ValidateJwtData;
    };

const toMissing = (userScopes: string[], requiredScopes: string[]): string[] =>
  requiredScopes.filter(
    requiredScope => !userScopes.find(userScope => requiredScope === userScope),
  );

export const validateScopesSimple: ValidateJwtData = (data, scopes = []) => {
  const missingScopes = toMissing(data.scopes ?? [], scopes);
  if (missingScopes.length) {
    throw new JWTAuthenticationError(401, {
      message: `Authorization error. User does not have required scopes: [${missingScopes.join(
        ', ',
      )}]`,
    });
  }
};

export const validateScopesKeycloak = (service: string): ValidateJwtData<JWTDataKeycloak> => (
  data,
  scopes = [],
) => {
  const userRoles = data.resource_access?.[service]?.roles ?? [];
  const missingRoles = toMissing(userRoles, scopes);

  if (missingRoles.length) {
    throw new JWTAuthenticationError(401, {
      message: `Authorization error. User does not have required roles: [${missingRoles.join(
        ', ',
      )}] for ${service}`,
    });
  }
};

export const createJwtSecurity = <TUser extends User = User>(
  options: JwtSecurityOptions,
): Middleware<JWTContext<TUser>> => {
  const secretOrPublicKey = 'secret' in options ? options.secret : options.publicKey;
  const secretOrPrivateKey = 'secret' in options ? options.secret : options.privateKey;
  const validateScopes = options.validateScopes ?? validateScopesSimple;

  const jwtContext: JWTContext<TUser> = {
    verifyAuthorization: (header, scopes) => {
      if (!secretOrPublicKey) {
        throw new JWTAuthenticationError(500, {
          message: 'Cannot verify token, no secret or pulbicKey specified',
        });
      }
      return jwtVerifyAuthorization({
        header,
        validateJwtData: data => validateScopes(data, scopes),
        secretOrPublicKey,
        verifyOptions: options.verifyOptions,
      });
    },
    createSession: (user, signOptions) => {
      if (!secretOrPrivateKey) {
        throw new JWTAuthenticationError(500, {
          message: 'Cannot create session, no secret or privateKey specified',
        });
      }
      return jwtCreateSession({
        user,
        secretOrPrivateKey,
        signOptions: { ...signOptions, ...options.signOptions },
      });
    },
  };

  return next => ctx => next({ ...ctx, ...jwtContext });
};
