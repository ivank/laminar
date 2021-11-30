import { Security } from '@ovotech/laminar';
import { SignOptions, Secret, GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';

export interface JWTData {
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

export interface Session {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: User;
}

export interface RequestAuthInfo {
  authInfo: User;
}

export interface RequestSign {
  sign: (user: User) => Session;
}

export type VerifyJWTData = (data: JWTData, scopes?: string[]) => Security<User>;

export interface JWTSign {
  secret: Secret;
  options?: SignOptions;
}

export interface JWTVerify {
  secret: string | Buffer | GetPublicKeyOrSecret;
  options?: VerifyOptions;
  verify?: VerifyJWTData;
}
