import {
  GetPublicKeyOrSecret,
  verify,
  TokenExpiredError,
  NotBeforeError,
  VerifyOptions,
} from 'jsonwebtoken';
import { JWTData, isJWTData, VerifiedJWTData } from './types';
import { JWTAuthenticationError } from './JWTAuthenticationError';
import { ValidateJwtData } from './createJwtSecurity';

export interface JwtVerifyOptions {
  secretOrPublicKey: string | Buffer | GetPublicKeyOrSecret;
  verifyOptions?: VerifyOptions;
  header?: string;
  validateJwtData?: ValidateJwtData;
}

export const jwtVerifyAuthorization = async ({
  secretOrPublicKey,
  verifyOptions,
  header,
  validateJwtData,
}: JwtVerifyOptions): Promise<JWTData> => {
  if (!header) {
    throw new JWTAuthenticationError(401, { message: 'Authorization header missing' });
  }
  const match = header.match(/^Bearer (.*)$/);
  if (!match) {
    throw new JWTAuthenticationError(401, {
      message: 'Authorization header is invalid. Needs to be "Bearer ${token}"',
    });
  }

  try {
    const data = await new Promise<VerifiedJWTData>((resolve, reject) =>
      verify(match[1], secretOrPublicKey, verifyOptions, (err, data) =>
        err ? reject(err) : resolve(data),
      ),
    );

    if (!isJWTData(data)) {
      throw new JWTAuthenticationError(401, {
        message: 'Authorization token malformed, needs to be object data',
      });
    }

    if (validateJwtData) {
      validateJwtData(data);
    }

    return data;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new JWTAuthenticationError(401, {
        message: `Authorization error. ${error.message}`,
        expiredAt: error.expiredAt,
      });
    } else if (error instanceof NotBeforeError) {
      throw new JWTAuthenticationError(401, {
        message: `Authorization error. ${error.message}`,
        date: error.date,
      });
    }

    throw error;
  }
};
