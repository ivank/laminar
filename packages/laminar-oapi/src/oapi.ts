import { resolveRefs } from '@ovotech/json-refs';
import { Schema, validate } from '@ovotech/json-schema';
import {
  Context,
  HttpError,
  isResponse,
  Resolver,
  response,
  Route,
  RouteContext,
  selectRoute,
  toRoute,
} from '@ovotech/laminar';
import * as OpenApiSchema from 'oas-schemas/schemas/v3.0/schema.json';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { merge } from './helpers';
import { OperationSchema, PathsSchema, toSchema } from './oapi-to-schema';
import { OapiResolverError } from './OapiResolverError';
import { ResoledOpenAPIObject } from './resolved-openapi-object';

export interface OapiContext extends Context {
  security?: any;
}

export interface OapiRoute<TContext extends OapiContext = OapiContext> extends Route<TContext> {
  schema: OperationSchema;
}

export interface OapiPaths<TContext extends {} = {}> {
  [path: string]: { [method: string]: Resolver<TContext & OapiContext & RouteContext> };
}

export type OapiSecurityResolver<TContext extends {} = {}> = (options: {
  context: TContext & OapiContext & RouteContext;
  scheme: SecuritySchemeObject;
  scopes: string[];
}) => any | Promise<any>;

export interface OapiSecurityResolvers<TContext extends {} = {}> {
  [key: string]: OapiSecurityResolver<TContext>;
}

const toRoutes = <TContext extends Context>(
  pathsSchema: PathsSchema,
  paths: {
    [path: string]: { [method: string]: Resolver<TContext> };
  },
) =>
  Object.entries(paths).reduce<Array<OapiRoute<TContext>>>(
    (allPaths, [path, methods]) =>
      Object.entries(methods).reduce(
        (all, [method, resolver]) => [
          ...all,
          {
            ...toRoute(method, path, resolver),
            schema: pathsSchema[path][method],
          },
        ],
        allPaths,
      ),
    [],
  );

const validateSecurity = async <TContext extends {} = {}>(
  context: TContext & OapiContext & RouteContext,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  resolvers?: OapiSecurityResolvers,
): Promise<any> => {
  if (!requirements || requirements.length === 0) {
    return undefined;
  }

  for (const requirement of requirements) {
    for (const name of Object.keys(requirement)) {
      if (!schemes || !schemes[name]) {
        throw new HttpError(500, { message: `Security ${name} not defined` });
      }
      if (!resolvers || !resolvers[name]) {
        throw new HttpError(500, { message: `Security resolver ${name} not implemented` });
      }
    }
  }

  const checks = requirements
    .map(async requirement => {
      const securityContexts = Object.entries(requirement).map(([name, scopes]) =>
        resolvers![name]({ context, scheme: schemes![name], scopes }),
      );
      return merge(await Promise.all(securityContexts));
    })
    .map(check => check.catch(error => error));

  const results = await Promise.all(checks);

  const checkPassed = results.find(result => !(result instanceof Error));

  if (!checkPassed) {
    throw results.find(result => result instanceof Error);
  }

  return checkPassed;
};

export const oapi = async <TPaths extends OapiPaths>({
  api,
  paths,
  securityResolvers,
}: {
  paths: TPaths;
  securityResolvers?: OapiSecurityResolvers;
  api: OpenAPIObject;
}): Promise<Resolver<Context>> => {
  const checkApi = await validate(OpenApiSchema as Schema, api);
  if (!checkApi.valid) {
    throw new OapiResolverError('Invalid API Definition', checkApi.errors);
  }

  const resolved = await resolveRefs<ResoledOpenAPIObject>(api);
  const schemas = toSchema(resolved.schema);
  const routes = toRoutes(schemas, paths);

  return async ctx => {
    const select = selectRoute(ctx, routes as OapiRoute[]);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname!} not found`,
      });
    }
    const {
      route: { resolver, schema },
      path,
    } = select;

    const context = { ...ctx, path };

    const checkContext = await validate(schema.context, context, {
      name: 'context',
      refs: resolved.refs,
    });

    if (!checkContext.valid) {
      throw new HttpError(400, {
        message: `Request Validation Error`,
        errors: checkContext.errors,
      });
    }

    const security = await validateSecurity(
      context,
      schema.security,
      resolved.schema.components && resolved.schema.components.securitySchemes,
      securityResolvers,
    );

    const result = resolver({ ...context, security });
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const checkResponse = await validate(schema.response, laminarResponse, {
      name: 'response',
      refs: resolved.refs,
    });

    if (!checkResponse.valid) {
      throw new HttpError(500, {
        message: `Response Validation Error`,
        errors: checkResponse.errors,
      });
    }

    return laminarResponse;
  };
};
