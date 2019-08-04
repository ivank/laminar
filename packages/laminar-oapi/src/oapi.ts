import { compile, Schema, validate, validateCompiled } from '@ovotech/json-schema';
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
import { openapiV3 } from 'openapi-schemas';
import { OpenAPIObject, SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { OperationSchema, PathsSchema, toSchema } from './oapi-to-schema';
import { OapiResolverError } from './OapiResolverError';
import { ResolvedOpenAPIObject } from './resolved-openapi-object';

export interface OapiContext extends RouteContext {
  authInfo?: OapiAuthInfo;
}

export interface OapiAuthInfo {
  [key: string]: unknown;
}

export interface OapiRoute<C extends object = {}> extends Route<C> {
  schema: OperationSchema;
}

export interface OapiPaths<C extends object = {}> {
  [path: string]: { [method: string]: Resolver<C & OapiContext & Context> };
}

export interface OapiConfig<C extends object = {}> {
  api: OpenAPIObject | string;
  paths: OapiPaths<C>;
  security?: OapiSecurity<C>;
}

export type OapiSecurityResolver<C extends object = {}> = (
  context: C & Context & OapiContext,
  options: {
    scheme: SecuritySchemeObject;
    scopes: string[];
  },
) => OapiAuthInfo | void | Promise<OapiAuthInfo | void>;

export interface OapiSecurity<C extends object = {}> {
  [key: string]: OapiSecurityResolver<C>;
}

const toRoutes = <C extends {} = {}>(
  pathsSchema: PathsSchema,
  paths: {
    [path: string]: { [method: string]: Resolver<C & OapiContext> };
  },
): OapiRoute<C>[] =>
  Object.entries(paths).reduce<OapiRoute<C>[]>(
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

export const isAuthInfo = (item: unknown): item is OapiAuthInfo =>
  typeof item == 'object' && item !== null;

const validateSecurity = async <C extends object = {}>(
  context: C & Context & OapiContext,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  security?: OapiSecurity<C>,
): Promise<unknown> => {
  if (!requirements || requirements.length === 0 || !security || !schemes) {
    return undefined;
  }

  const checks = requirements
    .map(async requirement => {
      const securityContexts = Object.entries(requirement)
        .map(([name, scopes]) => security[name](context, { scheme: schemes[name], scopes }))
        .filter(isAuthInfo);
      return (await Promise.all(securityContexts)).reduce((a, b) => ({ ...a, ...b }), {});
    })
    .map(check => check.catch(error => error));

  const results = await Promise.all(checks);
  const authInfo = results.find(result => !(result instanceof Error));

  if (!authInfo) {
    throw results.find(result => result instanceof Error);
  }

  return authInfo;
};

export const withOapi = async <C extends object = {}>({
  api,
  paths,
  security,
}: OapiConfig<C>): Promise<Resolver<C & Context>> => {
  const compiled = await compile<ResolvedOpenAPIObject>(api);

  const checkApi = await validate(openapiV3 as Schema, compiled.schema);
  if (!checkApi.valid) {
    throw new OapiResolverError('Invalid API Definition', checkApi.errors);
  }

  const schemas = toSchema(compiled.schema);
  const routes = toRoutes(schemas.routes, paths);

  const checkResolvers = validateCompiled(
    { ...compiled, schema: schemas.resolvers },
    { paths, security },
    { name: 'api' },
  );

  if (!checkResolvers.valid) {
    throw new OapiResolverError('Invalid Resolvers', checkResolvers.errors);
  }

  return async ctx => {
    const select = selectRoute<object, C, OapiRoute<C & Context>>(ctx, routes);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname} not found`,
      });
    }

    const {
      route: { resolver, schema },
      path,
    } = select;

    const context: C & Context & OapiContext = { ...ctx, path };

    const checkContext = validateCompiled({ ...compiled, schema: schema.context }, context, {
      name: 'context',
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
      compiled.schema.components && compiled.schema.components.securitySchemes,
      security,
    );

    const result = await resolver({ ...context, authInfo });
    const laminarResponse = isResponse(result) ? result : response({ body: result });
    const checkResponse = validateCompiled(
      { ...compiled, schema: schema.response },
      laminarResponse,
      { name: 'response' },
    );

    if (!checkResponse.valid) {
      throw new HttpError(500, {
        message: `Response Validation Error`,
        errors: checkResponse.errors,
      });
    }

    return laminarResponse;
  };
};
