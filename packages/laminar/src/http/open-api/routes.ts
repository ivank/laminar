import { HttpContext } from '../types';
import { Empty } from '../../types';
import { OapiPaths, Route, Matcher, OapiPath, Coerce } from './types';
import { ResolvedSchema, Schema, coerceCompiled, withinContext } from '@ovotech/json-schema';
import { toMatchPattern, toPathKeys, toPathRe } from '../../helpers';
import { oas31 } from 'openapi3-ts';
import { resolveRef } from './compile-oapi';

function toMatcher(path: string, method: string): Matcher {
  const uppercaseMethod = method.toUpperCase();
  const keys = toPathKeys(path);
  const re = toPathRe(path);
  return (ctx) => {
    if (!ctx.url.pathname || uppercaseMethod !== ctx.method) {
      return false;
    }

    const pathMatch = re.exec(ctx.url.pathname);
    if (pathMatch) {
      return pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {});
    }

    return false;
  };
}

/**
 * Convert an OpenApi parameter name into a parameter name from {@link RequestOapi}
 */
function toParamLocation(location: 'query' | 'header' | 'path' | 'cookie'): 'query' | 'headers' | 'path' | 'cookies' {
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
function toParameterSchema(param: oas31.ParameterObject) {
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
function toRequestBodySchema(requestBody: oas31.RequestBodyObject): Record<string, unknown> {
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
  schema: ResolvedSchema,
  security: oas31.SecurityRequirementObject[],
  schemes: { [securityScheme: string]: oas31.SecuritySchemeObject | oas31.ReferenceObject },
): void {
  security.map((item) =>
    Object.entries(item).map(([name]) => {
      const scheme = resolveRef(schema, schemes[name]);

      if (!scheme) {
        throw new Error(`Security scheme ${name} not defined in components.securitySchemes in the OpenApi Schema`);
      }
    }),
  );
}

/**
 * Convert an OpenApi request schema into an executable json-schema.
 */
function toRequestSchema(
  schema: ResolvedSchema,
  { security: defaultSecurity, components }: oas31.OpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: oas31.OperationObject,
  { parameters: commonParameters }: Pick<oas31.PathItemObject, 'summary' | 'parameters' | 'description'>,
): Schema {
  const security = operationSecurity ?? defaultSecurity;
  const securitySchemes = components && components.securitySchemes;
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);
  if (security && securitySchemes) {
    toSecuritySchema(schema, security, securitySchemes);
  }
  return {
    allOf: [
      ...allParameters.map((item) => resolveRef(schema, item)).map(toParameterSchema),
      ...(requestBody ? [toRequestBodySchema(resolveRef(schema, requestBody))] : []),
    ],
  };
}

/**
 * If a parameter is defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 * @param parameter
 *
 * @category http
 */
function toParameterCoerce<TContext extends Empty>(
  openapiSchema: ResolvedSchema,
  parameter: oas31.ParameterObject,
  type: 'query' | 'json',
): Coerce<TContext> | undefined {
  const schema = resolveRef(openapiSchema, parameter.schema) as Schema | undefined;
  if (schema) {
    return (ctx) => {
      const location = toParamLocation(parameter.in);
      const value = ctx[location]?.[parameter.name];
      const coercedValue = coerceCompiled({ schema: withinContext(schema, openapiSchema), type, value });
      return coercedValue !== undefined
        ? { ...ctx, [location]: { ...ctx[location], [parameter.name]: coercedValue } }
        : ctx;
    };
  } else {
    return undefined;
  }
}

/**
 * Convert the request based on the schema. Coerce request body data from json
 */
function toRequestBodyCoerce<TContext extends Empty>(
  openapiSchema: ResolvedSchema,
  requestBody: oas31.RequestBodyObject,
  type: 'query' | 'json',
): Coerce<TContext> {
  return (ctx) => {
    const content = resolveRef(openapiSchema, requestBody)?.content;
    const requestBodySchema = content
      ? Object.entries(content).find(([mimeType]) =>
          new RegExp(toMatchPattern(mimeType)).test(ctx.headers['content-type']),
        )?.[1].schema
      : undefined;
    const schema = resolveRef(openapiSchema, requestBodySchema) as Schema | undefined;
    return schema
      ? { ...ctx, body: coerceCompiled({ schema: withinContext(schema, openapiSchema), type, value: ctx.body }) }
      : ctx;
  };
}

/**
 * If a request has parameters, defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 *
 * @category http
 */
function toRequestConvert<TContext extends Empty>(
  schema: ResolvedSchema,
  { parameters, requestBody }: oas31.OperationObject,
  { parameters: commonParameters }: Pick<oas31.PathItemObject, 'parameters'>,
): Coerce<TContext> {
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);

  const coerceParameters = allParameters
    .map((item) => toParameterCoerce<TContext>(schema, resolveRef(schema, item), 'json'))
    .filter((item): item is Coerce<TContext> => Boolean(item))
    .concat(requestBody ? toRequestBodyCoerce<TContext>(schema, resolveRef(schema, requestBody), 'json') : []);

  return (ctx) => coerceParameters.reduce((acc, coerce) => coerce(acc), ctx);
}

/**
 * If a request has parameters, defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 *
 * @category http
 */
function toRequestCoerce<TContext extends Empty>(
  schema: ResolvedSchema,
  { parameters, requestBody }: oas31.OperationObject,
  { parameters: commonParameters }: Pick<oas31.PathItemObject, 'parameters'>,
): Coerce<TContext> {
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);

  const coerceParameters = allParameters
    .map((item) => toParameterCoerce<TContext>(schema, resolveRef(schema, item), 'query'))
    .filter((item): item is Coerce<TContext> => Boolean(item))
    .concat(requestBody ? toRequestBodyCoerce<TContext>(schema, resolveRef(schema, requestBody), 'query') : []);

  return (ctx) => coerceParameters.reduce((acc, coerce) => coerce(acc), ctx);
}

/**
 * Convert an OpenApi response schema into an executable json-schema.
 *
 * @category http
 */
function toResponseSchema(schema: ResolvedSchema, { responses }: oas31.OperationObject): Record<string, unknown> {
  return {
    discriminator: { propertyName: 'status' },
    oneOf: Object.entries<oas31.ResponseObject>(responses).map(([status, response]) => ({
      type: 'object',
      properties: {
        status: status === 'default' ? true : { enum: [Number(status)] },
        ...(response.headers
          ? {
              headers: {
                allOf: Object.entries(response.headers).map(([header, headerType]) => ({
                  properties: { [header]: resolveRef(schema, headerType).schema },
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
                  resolveRef(schema, mediaType.schema)?.type === 'string'
                    ? {
                        oneOf: [
                          resolveRef(schema, mediaType.schema),
                          { type: 'object', properties: { readable: { enum: [true] } } },
                        ],
                      }
                    : resolveRef(schema, mediaType.schema),
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
 *
 * @category http
 */
export function toRoutes<TContext extends Empty>(
  schema: ResolvedSchema,
  api: oas31.OpenAPIObject,
  oapiPaths: OapiPaths<TContext>,
): Route<TContext>[] {
  return Object.entries<oas31.PathItemObject>(api?.paths ?? []).reduce<Route<TContext>[]>(
    (pathRoutes, [path, pathParameters]) => {
      const { parameters: pathItemParameters, summary, description, ...methods } = resolveRef(schema, pathParameters);
      const parameters = pathItemParameters?.map((parameter) => resolveRef(schema, parameter));
      return [
        ...pathRoutes,
        ...Object.entries(methods).reduce<Route<TContext>[]>((methodRoutes, [method, operation]) => {
          return [
            ...methodRoutes,
            {
              request: toRequestSchema(schema, api, operation, { parameters, summary, description }),
              response: toResponseSchema(schema, operation),
              operation,
              schema,
              coerce: toRequestCoerce(schema, operation, { parameters }),
              convertRequest: toRequestConvert(schema, operation, { parameters }),
              security: operation.security || api.security,
              matcher: toMatcher(path, method),
              listener: oapiPaths[path][method],
            },
          ];
        }, []),
      ];
    },
    [],
  );
}

/**
 * Attempt to match the routes from {@link toRoutes} sequentially.
 * If a route matches, return it plus the captured path parameters
 *
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 * @category http
 */
export function selectRoute<TContext extends Empty = Empty>(
  ctx: TContext & HttpContext,
  routes: Route<TContext>[],
): false | { path: OapiPath; route: Route<TContext> } {
  for (const route of routes) {
    const path = route.matcher(ctx);
    if (path) {
      return { route, path };
    }
  }
  return false;
}
