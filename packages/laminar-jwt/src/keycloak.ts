import { HttpMiddleware, Empty, OapiSecurityResolver, securityOk, securityError, Security } from '@ovotech/laminar';
import { authMiddleware, jwtSecurityResolver, toMissing } from './jwt';
import { JWTVerify, RequestAuthInfo, User, JWTData, VerifyJWTData } from './types';

export interface KeycloakOptions extends JWTVerify {
  service: string;
}

export interface JWTDataKeycloak extends JWTData {
  resource_access?: { [key: string]: { roles: string[] } };
  email?: string;
  clientId?: string;
}

const isJWTDataKeycloak = (data: JWTData): data is JWTDataKeycloak =>
  typeof data.resource_access === 'object' && data.resource_access !== null;

export const verifyKeycloack =
  (service: string): VerifyJWTData =>
  <TUser extends User = User>(data: JWTData, scopes: string[] = []): Security<TUser> => {
    if (!isJWTDataKeycloak(data)) {
      return securityError({ message: `Malformed jwt data - resource_access missing, probably not a keycloack jwt` });
    }

    const clientScopes = data.resource_access?.[service]?.roles ?? [];
    const missingScopes = toMissing(clientScopes, scopes);
    if (missingScopes.length) {
      return securityError({
        message: `Client ${data.clientId} does not have any of the required roles: [${missingScopes.join(', ')}] for ${service}`,
        service,
      });
    }
    return securityOk<TUser>({ ...data, email: data.email ?? data?.clientId, scopes: clientScopes } as TUser);
  };

export const keycloakAuthMiddleware = (
  options: KeycloakOptions,
): ((scopes?: string[]) => HttpMiddleware<RequestAuthInfo>) =>
  authMiddleware({ ...options, verify: verifyKeycloack(options.service) });

export const keycloakJwtSecurityResolver = (options: KeycloakOptions): OapiSecurityResolver<Empty, User> =>
  jwtSecurityResolver({ ...options, verify: verifyKeycloack(options.service) });
