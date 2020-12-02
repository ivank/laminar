import { SignOptions, VerifyCallback, Secret, GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';

export interface JWTData {
  email: string;
  scopes?: string[];
  iat?: number;
  nbf?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface User {
  email: string;
  scopes?: string[];
  [key: string]: unknown;
}

export interface Session<TUser extends User = User> {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: TUser;
}

export interface RequestAuthInfo<TUser extends JWTData = JWTData> {
  authInfo: TUser;
}

export interface RequestSign<TUser extends User = User> {
  sign: (user: TUser) => Session<TUser>;
}

export type VerifiedJWTData = Parameters<VerifyCallback>[1];

export type ScopeError<TUser extends JWTData = JWTData> = (user: TUser, scopes?: string[]) => undefined | string;

export interface JWTSign {
  secret: Secret;
  options?: SignOptions;
}

export interface JWTVerify {
  secret: string | Buffer | GetPublicKeyOrSecret;
  options?: VerifyOptions;
  scopeError?: ScopeError;
}
