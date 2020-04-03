import { extendResponse, Middleware, response } from '..';

export interface CorsConfig {
  allowOrigin?: string[] | string | RegExp | OriginChecker | true;
  allowHeaders?: string[];
  allowCredentials?: true;
  allowMethods?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
}
type OriginChecker = (requestOrigin: string) => boolean;

const toAllowOrigin = (
  origin: CorsConfig['allowOrigin'],
  originHeader: string | string[] | undefined,
): string | undefined => {
  if (origin === true || origin === undefined) {
    return '*';
  } else if (typeof origin === 'string') {
    return origin;
  } else {
    const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

    if (requestOrigin) {
      if (Array.isArray(origin)) {
        return origin.find((item) => item === requestOrigin);
      } else if (origin instanceof RegExp) {
        return origin.test(requestOrigin) ? requestOrigin : undefined;
      } else if (origin instanceof Function) {
        return origin(requestOrigin) ? requestOrigin : undefined;
      }
    }
  }

  return undefined;
};

const toAllowHeaders = (
  headers: CorsConfig['allowHeaders'],
  requestHeaders: string | string[] | undefined,
): string | undefined => {
  const allowed = headers || requestHeaders;
  return Array.isArray(allowed) ? allowed.join(',') : allowed;
};

const toMaxAge = (maxAge: CorsConfig['maxAge']): string | undefined =>
  maxAge ? maxAge.toString() : undefined;

const toExposeHeaders = (headers: CorsConfig['exposeHeaders']): string | undefined =>
  Array.isArray(headers) ? headers.join(',') : headers;

const toAllowMethods = (methods: CorsConfig['allowMethods']): string =>
  (methods || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']).join(',');

const toAllowCredentials = (credentials: CorsConfig['allowCredentials']): 'true' | undefined =>
  credentials ? 'true' : undefined;

export const createCors = (config: CorsConfig = {}): Middleware => {
  const exposeHeaders = toExposeHeaders(config.exposeHeaders);
  const allowMethods = toAllowMethods(config.allowMethods);
  const maxAge = toMaxAge(config.maxAge);
  const allowCredentials = toAllowCredentials(config.allowCredentials);
  const initialHeaders = {
    ...(allowCredentials ? { 'Access-Control-Allow-Credentials': allowCredentials } : undefined),
    ...(exposeHeaders ? { 'Access-Control-Expose-Headers': exposeHeaders } : undefined),
  };
  const optionsHeaders = {
    ...(allowMethods ? { 'Access-Control-Allow-Methods': allowMethods } : undefined),
    ...(maxAge ? { 'Access-Control-Max-Age': maxAge } : undefined),
  };

  return (next) => {
    return async (ctx) => {
      const headers = {
        'Access-Control-Allow-Origin': toAllowOrigin(config.allowOrigin, ctx.headers.origin),
        ...initialHeaders,
      };

      if (ctx.method === 'OPTIONS') {
        return response({
          headers: {
            ...headers,
            ...optionsHeaders,
            'Access-Control-Allow-Headers': toAllowHeaders(
              config.allowHeaders,
              ctx.headers['access-control-request-headers'],
            ),
          },
          status: 204,
        });
      } else {
        const response = await next(ctx);
        return extendResponse(response, { headers });
      }
    };
  };
};
