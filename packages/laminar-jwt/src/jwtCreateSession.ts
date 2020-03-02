import { User, isJWTData, Session } from './types';
import { SignOptions, Secret, sign, decode } from 'jsonwebtoken';

export interface JwtCreateSessionOptions<TUser> {
  secretOrPrivateKey: Secret;
  signOptions?: SignOptions;
  user: TUser;
}

export const jwtCreateSession = <TUser extends User = User>({
  secretOrPrivateKey,
  signOptions,
  user,
}: JwtCreateSessionOptions<TUser>): Session<TUser> => {
  const jwt = sign(user, secretOrPrivateKey, signOptions);
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
