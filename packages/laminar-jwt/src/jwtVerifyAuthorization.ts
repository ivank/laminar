import {
  GetPublicKeyOrSecret,
  verify,
  TokenExpiredError,
  NotBeforeError,
  VerifyOptions,
} from 'jsonwebtoken';
import { JWTData, isJWTData } from './types';
import { JWTAuthenticationError } from './JWTAuthenticationError';

export interface JwtVerifyOptions {
  secretOrPublicKey: string | Buffer | GetPublicKeyOrSecret;
  verifyOptions?: VerifyOptions;
  header?: string;
  scopes?: string[];
}

export const jwtVerifyAuthorization = async ({
  secretOrPublicKey,
  verifyOptions,
  header,
  scopes,
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
    const data = await new Promise<string | object>((resolve, reject) =>
      verify(match[1], secretOrPublicKey, verifyOptions, (err, data) =>
        err ? reject(err) : resolve(data),
      ),
    );

    if (!isJWTData(data)) {
      throw new JWTAuthenticationError(401, {
        message: 'Authorization token malformed, needs to be object data',
      });
    }

    if (scopes) {
      const missingScopes = scopes.filter(
        requiredScope =>
          !data.scopes || !data.scopes.find(userScope => requiredScope === userScope),
      );

      if (missingScopes.length !== 0) {
        const scopes = missingScopes.join(', ');
        throw new JWTAuthenticationError(401, {
          message: `Authorization error. User does not have required scopes: [${scopes}]`,
        });
      }
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
