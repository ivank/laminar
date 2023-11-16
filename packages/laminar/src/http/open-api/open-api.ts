import { validate, toSchemaObject, withinContext } from '@laminarjs/json-schema';
import { Empty } from '../../types';
import { json } from '../response';
import { OapiContext, OapiConfig } from './types';
import { compileOapi } from './compile-oapi';
import { toRoutes, selectRoute } from './routes';
import { validateSecurity } from './security';
import { HttpContext, HttpListener } from '../types';
import { HttpError, isHttpError } from '../http-error';

/**
 * @category http
 */
export const defaultError: HttpListener<{ error: HttpError }> = async ({ error }) =>
  json({ body: error.body, status: error.code, headers: error.headers });

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
  const error = config.error ?? defaultError;
  const formatErrors = config.formatErrors;

  return async (ctx) => {
    const select = selectRoute<TContext>(ctx, routes);

    if (!select) {
      return error({
        ...ctx,
        error: new HttpError(404, {
          message: `Request for "${ctx.method} ${ctx.url.pathname}" did not match any of the paths defined in the OpenApi Schema`,
        }),
      });
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
      formatErrors,
    });

    if (!checkRequest.valid) {
      return error({
        ...ctx,
        error: new HttpError(400, {
          message: `Request for "${ctx.method} ${ctx.url.pathname}" does not match OpenApi Schema`,
          schema: select.route.request,
          errors: checkRequest.errors,
        }),
      });
    }

    const security = await validateSecurity<TContext>(
      oapi,
      reqOapi,
      select.route.security,
      oapi.schema.components?.securitySchemes,
      config.security,
    );

    if (security && isHttpError(security)) {
      return error({ ...ctx, error: security });
    }

    const convertedReqOapi = select.route.convertRequest(reqOapi);
    const res = await select.route.listener({ ...convertedReqOapi, authInfo: undefined, ...security });

    const checkResponse = validate({
      schema: withinContext(select.route.response, oapi),
      value: res,
      draft: 'openapi3',
      name: 'response',
      formatErrors,
    });

    if (!checkResponse.valid) {
      return error({
        ...ctx,
        error: new HttpError(500, {
          message: `Server response for "${ctx.method} ${ctx.url.pathname}" does not match OpenApi Schema`,
          errors: checkResponse.errors,
        }),
      });
    }

    return res;
  };
}
