import { validate, toSchemaObject, withinContext, ResultError } from '@ovotech/json-schema';
import { Empty } from '../../types';
import { jsonBadRequest, jsonInternalServerError, jsonNotFound } from '../response';
import { OapiContext, OapiConfig, Route } from './types';
import { compileOapi, resolveRef } from './compile-oapi';
import { toRoutes, selectRoute } from './routes';
import { toMatchPattern } from '../../helpers';
import { isSecurityResponse, validateSecurity } from './security';
import { HttpContext, HttpResponse, HttpListener } from '../types';

/**
 * If a request doesn't conform to the defined OpenApi schema,
 * Attempt to return the most information in order to help the user correct the error
 */
function toRequestError<TContext>(result: ResultError, route: Route<TContext>, ctx: HttpContext): HttpResponse {
  const contentMediaTypes = Object.entries(resolveRef(route.schema, route.operation.requestBody)?.content ?? {});
  const mediaType =
    contentMediaTypes.find(([mimeType]) =>
      new RegExp(toMatchPattern(mimeType)).test(ctx.headers['content-type'] ?? ''),
    )?.[1] ?? resolveRef(route.schema, route.operation.requestBody)?.content['default'];

  return jsonBadRequest({
    message: `Request for "${ctx.method} ${ctx.url.pathname}" does not match OpenApi Schema`,
    schema: route.request,
    errors: result.errors,
    ...(route.operation.summary ? { summary: route.operation.summary } : {}),
    ...(route.operation.description ? { description: route.operation.description } : {}),
    ...(route.operation.deprecated ? { deprecated: route.operation.deprecated } : {}),
    ...(mediaType ? { requestBody: mediaType } : {}),
  });
}

/**
 * If no path is found, this function would be called by default, Returning a 404 error
 *
 * @category http
 */
export const defaultOapiNotFound: HttpListener = async (ctx) =>
  jsonNotFound({
    message: `Request for "${ctx.method} ${ctx.url.pathname}" did not match any of the paths defined in the OpenApi Schema`,
  });

/**
 * Create an application using an OpenApi schema.
 * The api can be a filename (json or yaml) or a javascript object containing OpenApi Schema.
 * You also provide an {@link HttpListener} for each path. As well as all security resolvers
 *
 * @typeParam TContext pass the request properties that the app requires. Usually added by the middlewares
 * @category http
 */
export async function openApi<TContext extends Empty>(config: OapiConfig<TContext>): Promise<HttpListener<TContext>> {
  const oapi = await compileOapi(config);
  const routes = toRoutes<TContext>(oapi, toSchemaObject(oapi), config.paths);
  const notFound = config.notFound ?? defaultOapiNotFound;

  return async (ctx) => {
    const select = selectRoute<TContext>(ctx, routes);

    if (!select) {
      return notFound(ctx);
    }

    const reqOapi: TContext & HttpContext & OapiContext = select.route.coerce({
      ...ctx,
      authInfo: undefined,
      path: select.path,
    });

    const checkRequest = validate({
      schema: withinContext(select.route.request, oapi),
      draft: 'openapi3',
      name: 'request',
      value: reqOapi,
    });

    if (!checkRequest.valid) {
      return toRequestError<TContext>(checkRequest, select.route, ctx);
    }

    const security = await validateSecurity<TContext>(
      oapi,
      reqOapi,
      select.route.security,
      oapi.schema.components?.securitySchemes,
      config.security,
    );

    if (security && isSecurityResponse(security)) {
      return security;
    }

    const convertedReqOapi = select.route.convertRequest(reqOapi);
    const res = await select.route.listener({ ...convertedReqOapi, authInfo: undefined, ...security });

    const checkResponse = validate({
      schema: withinContext(select.route.response, oapi),
      value: res,
      draft: 'openapi3',
      name: 'response',
    });

    if (!checkResponse.valid) {
      return jsonInternalServerError({
        message: `Server response for "${ctx.method} ${ctx.url.pathname}" does not match OpenApi Schema`,
        errors: checkResponse.errors,
      });
    }

    return res;
  };
}
