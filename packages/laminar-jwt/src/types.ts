import { SignOptions } from 'jsonwebtoken';

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
}

export interface Session<TUser extends User = User> {
  jwt: string;
  expiresAt?: string;
  notBefore?: string;
  user: TUser;
}

export interface JWTContext<TUser extends User = User> {
  verifyAuthorization: (header?: string, scopes?: string[]) => Promise<JWTData>;
  createSession: (user: TUser, options?: SignOptions) => Session<TUser>;
  authInfo?: JWTData;
}

export interface JWTContextAuthenticated<TUser extends User = User> extends JWTContext<TUser> {
  authInfo: JWTData;
}

export const isJWTData = (data: object | string | null): data is JWTData =>
  data !== null && typeof data === 'object' && 'email' in data;
