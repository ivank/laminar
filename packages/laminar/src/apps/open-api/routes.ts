import { Empty, AppRequest } from '../..';
import {
  ResolvedOpenAPIObject,
  ResolvedOperationObject,
  ResolvedParameterObject,
  ResolvedPathItemObject,
  ResolvedRequestBodyObject,
  ResolvedResponseObject,
} from './resolved-openapi-object';
import { OapiPaths, Route, Matcher, OapiPath } from './types';
import { Schema } from '@ovotech/json-schema';
import { toMatchPattern, toPathKeys, toPathRe } from '../../helpers';
import { SecurityRequirementObject, SecuritySchemeObject, SchemaObject } from 'openapi3-ts';

function toMatcher(path: string, method: string): Matcher {
  const uppercaseMethod = method.toUpperCase();
  const keys = toPathKeys(path);
  const re = toPathRe(path);
  return (req) => {
    if (!req.url.pathname || uppercaseMethod !== req.method) {
      return false;
    }

    const pathMatch = re.exec(req.url.pathname);
    if (pathMatch) {
      return pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {});
    }

    return false;
  };
}

/**
 * Convert an OpenApi parameter name into a parameter name from {@link RequestOapi}
 */
function toParamLocation(location: string): string {
  switch (location) {
    case 'header':
      return 'headers';
    case 'cookie':
      return 'cookies';
    default:
      return location;
  }
}

/**
 * Convert an OpenApi parameter into a name that would exist in its location
 */
function toParamName(location: string, name: string): string {
  return location === 'header' ? name.toLowerCase() : name;
}

/**
 * Convert OpenApi parameter schema into an executable json-schema
 */
function toParameterSchema(param: ResolvedParameterObject): SchemaObject {
  const name = toParamName(param.in, param.name);

  return {
    properties: {
      [toParamLocation(param.in)]: {
        ...(param.required ? { required: [name] } : {}),
        ...(param.schema ? { properties: { [name]: param.schema } } : {}),
      },
    },
  };
}

/**
 * Convert a request body OpenApi schema into an executable json-schema
 */
function toRequestBodySchema(requestBody: ResolvedRequestBodyObject): Record<string, unknown> {
  return {
    ...(requestBody.required ? { required: ['body'] } : {}),
    ...(requestBody.content
      ? {
          discriminator: { propertyName: 'headers' },
          oneOf: Object.entries(requestBody.content).map(([match, mediaType]) => ({
            properties: {
              headers: {
                type: 'object',
                required: ['content-type'],
                properties: {
                  'content-type': { type: 'string', pattern: toMatchPattern(match) },
                },
              },
              body: mediaType.schema,
            },
          })),
        }
      : {}),
  };
}

/**
 * Validate a security schema, if there is no security resolver defined for a schema, raise an exception
 */
function toSecuritySchema(
  security: SecurityRequirementObject[],
  schemes: { [securityScheme: string]: SecuritySchemeObject },
): void {
  security.map((item) =>
    Object.entries(item).map(([name]) => {
      const scheme = schemes[name];

      if (!scheme) {
        throw new Error(
          `Security scheme ${name} not defined in components.securitySchemes in the OpenApi Schema`,
        );
      }
    }),
  );
}

/**
 * Convert an OpenApi request schema into an executable json-schema.
 */
function toRequestSchema(
  { security: defaultSecurity, components }: ResolvedOpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: ResolvedOperationObject,
  {
    parameters: commonParameters,
  }: Pick<ResolvedPathItemObject, 'summary' | 'parameters' | 'description'>,
): Schema {
  const security = operationSecurity || defaultSecurity;
  const securitySchemes = components && components.securitySchemes;
  const allParameters = [
    ...(parameters ? parameters : []),
    ...(commonParameters ? commonParameters : []),
  ];
  if (security && securitySchemes) {
    toSecuritySchema(security, securitySchemes);
  }
  return {
    allOf: [
      ...allParameters.map(toParameterSchema),
      ...(requestBody ? [toRequestBodySchema(requestBody)] : []),
    ],
  };
}

/**
 * Convert an OpenApi response schema into an executable json-schema.
 */
function toResponseSchema({ responses }: ResolvedOperationObject): Record<string, unknown> {
  return {
    discriminator: { propertyName: 'status' },
    oneOf: Object.entries<ResolvedResponseObject>(responses).map(([status, response]) => ({
      type: 'object',
      properties: {
        status: status === 'default' ? true : { const: Number(status) },
        ...(response.headers
          ? {
              headers: {
                allOf: Object.entries(response.headers).map(([header, headerType]) => ({
                  properties: { [header]: headerType.schema },
                })),
              },
            }
          : {}),
      },
      ...(response.content
        ? {
            discriminator: { propertyName: 'headers' },
            oneOf: Object.entries(response.content).map(([match, mediaType]) => ({
              properties: {
                headers: {
                  type: 'object',
                  required: ['content-type'],
                  properties: {
                    'content-type': { type: 'string', pattern: toMatchPattern(match) },
                  },
                },
                body:
                  mediaType.schema?.type === 'string'
                    ? {
                        oneOf: [
                          mediaType.schema,
                          { type: 'object', properties: { readable: { const: true } } },
                        ],
                      }
                    : mediaType.schema,
              },
            })),
          }
        : {}),
    })),
  };
}

/**
 * Convert a resolver OpenApi schema object and some paths functions into a routed application
 * Each path would correspond to the correct resolver form the oapiPaths parameter.
 *
 * @param api
 * @param oapiPaths
 */
export function toRoutes<TRequest extends Empty>(
  api: ResolvedOpenAPIObject,
  oapiPaths: OapiPaths<TRequest>,
): Route<TRequest>[] {
  return Object.entries(api.paths).reduce<Route<TRequest>[]>(
    (pathRoutes, [path, pathParameters]) => {
      const { parameters, summary, description, ...methods } = pathParameters;
      return [
        ...pathRoutes,
        ...Object.entries(methods).reduce<Route<TRequest>[]>(
          (methodRoutes, [method, operation]) => {
            return [
              ...methodRoutes,
              {
                request: toRequestSchema(api, operation, { parameters, summary, description }),
                response: toResponseSchema(operation),
                operation,
                security: operation.security || api.security,
                matcher: toMatcher(path, method),
                resolver: oapiPaths[path][method],
              },
            ];
          },
          [],
        ),
      ];
    },
    [],
  );
}

/**
 * Attempt to match the routes from {@link toRoutes} sequentially.
 * If a route matches, return it plus the captured path parameters
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export function selectRoute<TRequest extends Empty = Empty>(
  req: TRequest & AppRequest,
  routes: Route<TRequest>[],
): false | { path: OapiPath; route: Route<TRequest> } {
  for (const route of routes) {
    const path = route.matcher(req);
    if (path) {
      return { route, path };
    }
  }
  return false;
}
