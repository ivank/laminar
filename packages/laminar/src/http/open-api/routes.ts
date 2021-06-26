import { HttpContext } from '../types';
import { Empty } from '../../types';
import { OapiPaths, Route, Matcher, OapiPath, Coerce } from './types';
import { ResolvedSchema, Schema } from '@ovotech/json-schema';
import { toMatchPattern, toPathKeys, toPathRe } from '../../helpers';
import {
  SecurityRequirementObject,
  SecuritySchemeObject,
  SchemaObject,
  OperationObject,
  PathItemObject,
  ParameterObject,
  OpenAPIObject,
  RequestBodyObject,
  ReferenceObject,
  ResponseObject,
} from 'openapi3-ts';
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
function toParameterSchema(param: ParameterObject): SchemaObject {
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
function toRequestBodySchema(requestBody: RequestBodyObject): Record<string, unknown> {
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
  security: SecurityRequirementObject[],
  schemes: { [securityScheme: string]: SecuritySchemeObject | ReferenceObject },
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
  { security: defaultSecurity, components }: OpenAPIObject,
  { requestBody, parameters, security: operationSecurity }: OperationObject,
  { parameters: commonParameters }: Pick<PathItemObject, 'summary' | 'parameters' | 'description'>,
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
 * Coerce raw string value into its intended type, based on the Json Schema
 * Since query parameters come only as string, but we still want to type them as "integer" or "boolean"
 * We attempt to coerce the type to the desired one
 *
 * Additionally, we assign default values where appropriate
 */
type Coercer = (
  value: string | Record<string, string> | string[],
  schema: ResolvedSchema,
  valueSchema: SchemaObject | undefined,
) => unknown;

const trueString = ['true', 'yes', '1'];
const falseString = ['false', 'no', '0'];

const coercers: { [key: string]: Coercer | undefined } = {
  integer: (value) => {
    const num = Number(value);
    return Number.isInteger(num) ? num : value;
  },
  number: (value) => {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  },
  boolean: (value) =>
    typeof value === 'string'
      ? trueString.includes(value)
        ? true
        : falseString.includes(value)
        ? false
        : value
      : value,
  null: (value) => (value === 'null' ? null : value),
  array: (value, schema, valueSchema: SchemaObject | undefined) =>
    Array.isArray(value)
      ? value.map((itemValue) => {
          const propertySchema = resolveRef(schema, valueSchema?.items);
          const coercer = coercers[propertySchema?.type ?? ''];
          return coercer ? coercer(itemValue, schema, propertySchema) : itemValue;
        })
      : value,
  object: (value, schema, valueSchema: SchemaObject | undefined) => {
    const properties = valueSchema?.properties;
    if (properties && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(properties).reduce((acc, [name, propertySchema]) => {
        const resolvedPropertySchema = resolveRef(schema, propertySchema);
        const coercer = coercers[resolvedPropertySchema?.type ?? ''];
        const resolvedPropertyValue = value?.[name] ?? resolvedPropertySchema?.default;
        const coercedPropertyValue =
          resolvedPropertyValue !== undefined && coercer
            ? coercer(resolvedPropertyValue, schema, resolvedPropertySchema)
            : resolvedPropertyValue;
        return { ...acc, [name]: coercedPropertyValue };
      }, {});
    } else {
      return value;
    }
  },
};

/**
 * If a parameter is defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 * @param parameter
 *
 * @category http
 */
function toParameterCoerce<TContext extends Empty>(
  schema: ResolvedSchema,
  parameter: ParameterObject,
): Coerce<TContext> | undefined {
  const resolvedSchema = resolveRef(schema, parameter.schema);
  const coercer = coercers[resolvedSchema?.type ?? ''];
  if (coercer) {
    return (ctx) => {
      const location = toParamLocation(parameter.in);
      const rawValue = ctx[location]?.[parameter.name] ?? resolvedSchema?.default;

      if (rawValue !== undefined) {
        const value = coercer(rawValue, schema, resolvedSchema);
        return { ...ctx, [location]: { ...ctx[location], [parameter.name]: value } };
      } else {
        return ctx;
      }
    };
  } else {
    return undefined;
  }
}

/**
 * If a request has parameters, defined to be integer, attempt to convert the string value to integer first
 * Since all parameter values would be strings, this allows us to validate even numeric values
 *
 * @category http
 */
function toRequestCoerce<TContext extends Empty>(
  schema: ResolvedSchema,
  { parameters }: OperationObject,
  { parameters: commonParameters }: Pick<PathItemObject, 'parameters'>,
): Coerce<TContext> {
  const allParameters = (parameters ?? []).concat(commonParameters ?? []);

  const coerceParameters = allParameters
    .map((item) => toParameterCoerce<TContext>(schema, resolveRef(schema, item)))
    .filter((item): item is Coerce<TContext> => Boolean(item));

  return (ctx) => coerceParameters.reduce((acc, coerce) => coerce(acc), ctx);
}

/**
 * Convert an OpenApi response schema into an executable json-schema.
 *
 * @category http
 */
function toResponseSchema(schema: ResolvedSchema, { responses }: OperationObject): Record<string, unknown> {
  return {
    discriminator: { propertyName: 'status' },
    oneOf: Object.entries<ResponseObject>(responses).map(([status, response]) => ({
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
  api: OpenAPIObject,
  oapiPaths: OapiPaths<TContext>,
): Route<TContext>[] {
  return Object.entries<PathItemObject>(api.paths).reduce<Route<TContext>[]>((pathRoutes, [path, pathParameters]) => {
    const { parameters, summary, description, ...methods } = pathParameters;
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
            security: operation.security || api.security,
            matcher: toMatcher(path, method),
            listener: oapiPaths[path][method],
          },
        ];
      }, []),
    ];
  }, []);
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
