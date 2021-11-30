import { Empty } from '../../types';
import { HttpContext } from '../types';
import { ReferenceObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { OapiAuthInfo, OapiSecurity, OapiContext, Security, SecurityOk } from './types';
import { ResolvedSchema } from '@ovotech/json-schema';
import { resolveRef } from './compile-oapi';
import { HttpError, isHttpError } from '../http-error';
import { OutgoingHttpHeaders } from 'http';

/**
 * Return a {@link SecurityOk} object, indicating a successfull security check. Should be returned by a {@link OapiSecurityResolver}
 *
 * @category http
 */
export function securityOk<TOapiAuthInfo extends OapiAuthInfo>(authInfo: TOapiAuthInfo): SecurityOk<TOapiAuthInfo> {
  return { authInfo };
}

/**
 * Return a {@link HttpError} object, indicating a faild security check. Should be returned by a {@link OapiSecurityResolver}
 *
 * @category http
 */
export function securityError(body: { message: string; [key: string]: unknown }): HttpError {
  return new HttpError(403, body);
}

/**
 * Return a {@link HttpError} object, indicating a faild security check, to redirect to a new page Should be returned by a {@link OapiSecurityResolver}
 *
 * @category http
 */
export function securityRedirect(
  location: string,
  { body, headers = {} }: { body?: { message: string; [key: string]: unknown }; headers?: OutgoingHttpHeaders },
): HttpError {
  return new HttpError(302, body ?? { message: `Redirecting to ${location}` }, { ...headers, location: location });
}

/**
 * Check if a response from {@link OapiSecurityResolver} is a {@link SecurityOk} object, indicating a successfull security check
 *
 * @category http
 */
export function isSecurityOk(item: unknown): item is SecurityOk {
  return typeof item === 'object' && item !== null && 'authInfo' in item;
}

/**
 * Using the OpenApi schema requiremnts over the current request.
 *
 * @category http
 */
export async function validateSecurity<
  TContext extends Empty = Empty,
  TOapiAuthInfo extends OapiAuthInfo = OapiAuthInfo,
>(
  schema: ResolvedSchema,
  ctx: TContext & HttpContext & OapiContext,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject | ReferenceObject },
  security?: OapiSecurity<TContext, TOapiAuthInfo>,
): Promise<Security<TOapiAuthInfo> | undefined> {
  if (!requirements?.length || !security || !schemes) {
    return undefined;
  }

  const resultGroups = await Promise.all(
    requirements.map((group) =>
      Promise.all(
        Object.entries(group).map(([name, scopes]) =>
          security[name]({ ...ctx, securityScheme: resolveRef(schema, schemes[name]), scopes }),
        ),
      ),
    ),
  );

  const combinedResultGroups = resultGroups.map((group) =>
    group.every(isSecurityOk) ? group[0] : group.filter(isHttpError)[0],
  );
  return combinedResultGroups.find(isSecurityOk) ?? combinedResultGroups.filter(isHttpError)[0];
}
