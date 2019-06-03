import { resolveRefs } from '@ovotech/json-refs';
import { compile, Schema, validate } from '@ovotech/json-schema';
import {
  Addition,
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
import { ResolvedOpenAPIObject } from './resolved-openapi-object';

export interface OapiContext extends RouteContext {
  authInfo?: any;
}

export interface OapiRoute<C extends Addition = {}> extends Route<C> {
  schema: OperationSchema;
}

export interface OapiPaths<C extends Addition = {}> {
  [path: string]: { [method: string]: Resolver<C & OapiContext> };
}

export interface OapiConfig<C extends Addition = {}> {
  api: OpenAPIObject;
  paths: OapiPaths<C>;
  security?: OapiSecurity<C>;
}

export type OapiSecurityResolver<C extends Addition = {}> = (
  context: C & Context & OapiContext,
  options: {
    scheme: SecuritySchemeObject;
    scopes: string[];
  },
) => any | Promise<any>;

export interface OapiSecurity<C extends Addition = {}> {
  [key: string]: OapiSecurityResolver<C>;
}

const toRoutes = <C extends {} = {}>(
  pathsSchema: PathsSchema,
  paths: {
    [path: string]: { [method: string]: Resolver<C & OapiContext> };
  },
) =>
  Object.entries(paths).reduce<Array<OapiRoute<C>>>(
    (allPaths, [path, methods]) =>
      Object.entries(methods).reduce(
        (all, [method, resolver]) => [
          ...all,
          {
            ...toRoute<C & OapiContext>(method, path, resolver),
            schema: pathsSchema[path][method],
          },
        ],
        allPaths,
      ),
    [],
  );

const validateSecurity = async <C extends Addition = {}>(
  context: C & Context & OapiContext,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  security?: OapiSecurity<C>,
): Promise<any> => {
  if (!requirements || requirements.length === 0) {
    return undefined;
  }

  const checks = requirements
    .map(async requirement => {
      const securityContexts = Object.entries(requirement).map(([name, scopes]) =>
        security![name](context, { scheme: schemes![name], scopes }),
      );
      return merge(await Promise.all(securityContexts));
    })
    .map(check => check.catch(error => error));

  const results = await Promise.all(checks);
  const authInfo = results.find(result => !(result instanceof Error));

  if (!authInfo) {
    throw results.find(result => result instanceof Error);
  }

  return authInfo;
};

export const oapi = async <C extends Addition = {}>({
  api,
  paths,
  security,
}: OapiConfig<C>): Promise<Resolver<C & Context>> => {
  const checkApi = (await compile(OpenApiSchema as Schema))(api);
  if (!checkApi.valid) {
    throw new OapiResolverError('Invalid API Definition', checkApi.errors);
  }
  const resolved = await resolveRefs<ResolvedOpenAPIObject>(api);

  const schemas = toSchema(resolved.schema);
  const routes = toRoutes(schemas.routes, paths);

  const checkResolvers = validate(
    schemas.resolvers,
    { paths, security },
    { name: 'api', refs: resolved.refs },
  );

  if (!checkResolvers.valid) {
    throw new OapiResolverError('Invalid Resolvers', checkResolvers.errors);
  }

  return async ctx => {
    const select = selectRoute<Addition, C, OapiRoute<C>>(ctx, routes);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname!} not found`,
      });
    }

    const {
      route: { resolver, schema },
      path,
    } = select;

    const context: C & Context & OapiContext = { ...ctx, path };

    const checkContext = validate(schema.context, context, {
      name: 'context',
      refs: resolved.refs,
    });

    if (!checkContext.valid) {
      throw new HttpError(400, {
        message: `Request Validation Error`,
        errors: checkContext.errors,
      });
    }

    const authInfo = await validateSecurity<C>(
      context,
      schema.security,
      resolved.schema.components && resolved.schema.components.securitySchemes,
      security,
    );

    const result = resolver({ ...context, authInfo });
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const checkResponse = validate(schema.response, laminarResponse, {
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
