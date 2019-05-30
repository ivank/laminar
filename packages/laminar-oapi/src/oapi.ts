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
import { OpenAPIObject } from 'openapi3-ts';
import { OperationSchema, PathsSchema, toPathsSchema } from './oapi-to-schema';
import { OapiResolverError } from './OapiResolverError';

interface OapiRoute<TContext extends Context = Context> extends Route<TContext> {
  schema: OperationSchema;
}

export interface LaminarPaths<TContext extends Context = Context> {
  [path: string]: { [method: string]: Resolver<TContext & RouteContext> };
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

export const oapi = async <TPaths extends LaminarPaths>({
  api,
  paths,
}: {
  paths: TPaths;
  api: OpenAPIObject;
}): Promise<Resolver<Context>> => {
  const checkApi = await validate(OpenApiSchema as Schema, api);
  if (!checkApi.valid) {
    throw new OapiResolverError('Invalid API Definition', checkApi.errors);
  }

  const resolved = await resolveRefs(api);
  const schemas = toPathsSchema(resolved.schema.paths);
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

    const result = resolver(context);
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
