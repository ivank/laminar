import { AppRequest, Response, Empty } from '@ovotech/laminar';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { OapiAuthInfo, OapiSecurity, RequestOapi, Security, SecurityOk } from './types';

export const securityOk = <TOapiAuthInfo extends OapiAuthInfo>(
  authInfo: TOapiAuthInfo,
): Security<TOapiAuthInfo> => ({ authInfo });

export const isSecurityOk = (item: Security): item is SecurityOk => 'authInfo' in item;

export const isSecurityResponse = (item: Security): item is Response => 'status' in item;

export const validateSecurity = async <
  T extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo
>(
  req: T & AppRequest & RequestOapi,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  security?: OapiSecurity<T, TOapiAuthInfo>,
): Promise<Security<TOapiAuthInfo> | undefined> => {
  if (!requirements?.length || !security || !schemes) {
    return undefined;
  }

  const resultGroups = await Promise.all(
    requirements.map((group) =>
      Promise.all(
        Object.entries(group).map(([name, scopes]) =>
          security[name]({ ...req, securityScheme: schemes[name], scopes }),
        ),
      ),
    ),
  );

  const combinedResultGroups = resultGroups.map((group) =>
    group.every(isSecurityOk) ? group[0] : group.filter(isSecurityResponse)[0],
  );
  return (
    combinedResultGroups.find(isSecurityOk) ?? combinedResultGroups.filter(isSecurityResponse)[0]
  );
};
