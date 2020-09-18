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
import { RequestOapi, OapiSecurity, OapiConfig, OapiAuthInfo, Route } from './types';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts';
import { toResolvedOpenAPIObject } from './resolve';
import { toRoutes, selectRoute } from './routes';
import { toMatchPattern } from './helpers';

const isAuthInfo = (item: unknown): item is OapiAuthInfo =>
  typeof item == 'object' && item !== null;

const validateSecurity = async <T extends Empty = Empty>(
  req: T & AppRequest & RequestOapi,
  requirements?: SecurityRequirementObject[],
  schemes?: { [securityScheme: string]: SecuritySchemeObject },
  security?: OapiSecurity<T>,
): Promise<unknown> => {
  if (!requirements || requirements.length === 0 || !security || !schemes) {
    return undefined;
  }

  const checks = requirements
    .map(async (requirement) => {
      const securityContexts = Object.entries(requirement)
        .map(([name, scopes]) => security[name]({ ...req, securityScheme: schemes[name], scopes }))
        .filter(isAuthInfo);
      return (await Promise.all(securityContexts)).reduce((a, b) => ({ ...a, ...b }), {});
    })
    .map((check) => check.catch((error) => error));

  const results = await Promise.all(checks);
  const authInfo = results.find((result) => !(result instanceof Error));

  if (!authInfo) {
    throw results.find((result) => result instanceof Error);
  }

  return authInfo;
};

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

    const authInfo = await validateSecurity<T>(
      reqOapi,
      select.route.security,
      oapi.schema.components?.securitySchemes,
      config.security,
    );

    const res = await select.route.resolver({ ...reqOapi, authInfo });
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
