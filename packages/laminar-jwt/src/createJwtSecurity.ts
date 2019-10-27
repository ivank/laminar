import { SignOptions, VerifyOptions, GetPublicKeyOrSecret, Secret } from 'jsonwebtoken';
import { User, JWTContext } from './types';
import { Middleware } from '@ovotech/laminar';
import { jwtVerifyAuthorization } from './jwtVerifyAuthorization';
import { jwtCreateSession } from './jwtCreateSession';
import { JWTAuthenticationError } from './JWTAuthenticationError';

export type JwtSecurityOptions =
  | {
      secret: string;
      signOptions?: SignOptions;
      verifyOptions?: VerifyOptions;
    }
  | {
      publicKey?: string | Buffer | GetPublicKeyOrSecret;
      privateKey?: Secret;
      signOptions?: SignOptions;
      verifyOptions?: VerifyOptions;
    };

export const createJwtSecurity = <TUser extends User = User>(
  options: JwtSecurityOptions,
): Middleware<JWTContext<TUser>> => {
  const secretOrPublicKey = 'secret' in options ? options.secret : options.publicKey;
  const secretOrPrivateKey = 'secret' in options ? options.secret : options.privateKey;

  const jwtContext: JWTContext<TUser> = {
    verifyAuthorization: (header, scopes) => {
      if (!secretOrPublicKey) {
        throw new JWTAuthenticationError(500, {
          message: 'Cannot verify token, no secret or pulbicKey specified',
        });
      }
      return jwtVerifyAuthorization({
        header,
        scopes,
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
