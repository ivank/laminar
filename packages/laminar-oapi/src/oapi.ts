import {
  validateCompiled,
  toSchemaObject,
  compileInContext,
  ResultError,
} from '@ovotech/json-schema';
import {
  App,
  AppRequest,
  Empty,
  jsonBadRequest,
  jsonInternalServerError,
  jsonNotFound,
  Response,
} from '@ovotech/laminar';
import { RequestOapi, OapiConfig, Route } from './types';
import { toResolvedOpenAPIObject } from './resolve';
import { toRoutes, selectRoute } from './routes';
import { toMatchPattern } from './helpers';
import { isSecurityResponse, validateSecurity } from './security';

export const toRequestError = <T>(
  result: ResultError,
  route: Route<T>,
  req: AppRequest,
): Response => {
  const contentMediaTypes = Object.entries(route.operation.requestBody?.content ?? {});
  const mediaType =
    contentMediaTypes.find(([mimeType]) =>
      new RegExp(toMatchPattern(mimeType)).test(req.headers['content-type'] ?? ''),
    )?.[1] ?? route.operation.requestBody?.content['default'];

  return jsonBadRequest({
    message: `Request for "${req.method} ${req.url.pathname}" does not match OpenApi Schema`,
    schema: route.request,
    errors: result.errors,
    ...(route.operation.summary ? { summary: route.operation.summary } : {}),
    ...(route.operation.description ? { description: route.operation.description } : {}),
    ...(route.operation.deprecated ? { deprecated: route.operation.deprecated } : {}),
    ...(mediaType ? { requestBody: mediaType } : {}),
  });
};

export const createOapi = async <T extends Empty>(config: OapiConfig<T>): Promise<App<T>> => {
  const oapi = await toResolvedOpenAPIObject(config);
  const routes = toRoutes<T>(toSchemaObject(oapi), config.paths);

  return async (req) => {
    const select = selectRoute<T>(req, routes);

    if (!select) {
      return jsonNotFound({
        message: `Request for "${req.method} ${req.url.pathname}" did not match any of the paths defined in the OpenApi Schema`,
      });
    }

    const reqOapi: AppRequest & RequestOapi & T = {
      ...req,
      authInfo: undefined,
      path: select.path,
    };

    const checkRequest = validateCompiled({
      schema: compileInContext(select.route.request, oapi),
      name: 'request',
      value: reqOapi,
    });

    if (!checkRequest.valid) {
      return toRequestError<T>(checkRequest, select.route, req);
    }

    const security = await validateSecurity<T>(
      reqOapi,
      select.route.security,
      oapi.schema.components?.securitySchemes,
      config.security,
    );

    if (security && isSecurityResponse(security)) {
      return security;
    }

    const res = await select.route.resolver({ ...reqOapi, ...security });
    const checkResponse = validateCompiled({
      schema: compileInContext(select.route.response, oapi),
      value: res,
      name: 'response',
    });

    if (!checkResponse.valid) {
      return jsonInternalServerError({
        message: `Server response for "${req.method} ${req.url.pathname}" does not match OpenApi Schema`,
        errors: checkResponse.errors,
      });
    }

    return res;
  };
};
