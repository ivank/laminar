import { Security } from '@ovotech/laminar';
import { SignOptions, Secret, GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';

export interface JWTData {
  iat?: number;
  nbf?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface User {
  email?: string;
  scopes?: string[];
  [key: string]: unknown;
}

export interface Session<TUser extends User = User> {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: TUser;
}

export interface RequestAuthInfo<TUser extends User = User> {
  authInfo: TUser;
}

export interface RequestSign<TUser extends User = User> {
  sign: (user: TUser) => Session;
}

export type VerifyJWTData = <TUser extends User = User>(data: JWTData, scopes?: string[]) => Security<TUser>;

export interface JWTSign {
  secret: Secret;
  options?: SignOptions;
}

export interface JWTVerify {
  secret: string | Buffer | GetPublicKeyOrSecret;
  options?: VerifyOptions;
  verify?: VerifyJWTData;
}
