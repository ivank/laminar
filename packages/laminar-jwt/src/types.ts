import { HttpResponse, SecurityOk } from '@ovotech/laminar';
import { SignOptions, VerifyCallback, Secret, GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';

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

export type VerifiedJWTData = Parameters<VerifyCallback>[1];

export type VerifyJWTData = (data: JWTData, scopes?: string[]) => SecurityOk<User> | HttpResponse;

export interface JWTSign {
  secret: Secret;
  options?: SignOptions;
}

export interface JWTVerify {
  secret: string | Buffer | GetPublicKeyOrSecret;
  options?: VerifyOptions;
  verify?: VerifyJWTData;
}
