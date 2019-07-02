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
) => {
  if (origin === true || origin === undefined) {
    return '*';
  } else if (typeof origin === 'string') {
    return origin;
  } else {
    const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

    if (requestOrigin) {
      if (Array.isArray(origin)) {
        return origin.find(item => item === requestOrigin);
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
) => {
  const allowed = headers || requestHeaders;
  return Array.isArray(allowed) ? allowed.join(',') : allowed;
};

const toMaxAge = (maxAge: CorsConfig['maxAge']) => (maxAge ? maxAge.toString() : undefined);

const toExposeHeaders = (headers: CorsConfig['exposeHeaders']) =>
  Array.isArray(headers) ? headers.join(',') : headers;

const toAllowMethods = (methods: CorsConfig['allowMethods']) =>
  (methods || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']).join(',');

const toAllowCredentials = (credentials: CorsConfig['allowCredentials']) =>
  credentials ? 'true' : undefined;

export const withCors = (config: CorsConfig = {}): Middleware => resolver => {
  return ctx => {
    const headers = {
      'Access-Control-Allow-Origin': toAllowOrigin(config.allowOrigin, ctx.headers.origin),
      'Access-Control-Allow-Credentials': toAllowCredentials(config.allowCredentials),
      'Access-Control-Expose-Headers': toExposeHeaders(config.exposeHeaders),
    };

    if (ctx.method === 'OPTIONS') {
      return response({
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': toAllowMethods(config.allowMethods),
          'Access-Control-Max-Age': toMaxAge(config.maxAge),
          'Access-Control-Allow-Headers': toAllowHeaders(
            config.allowHeaders,
            ctx.headers['access-control-request-headers'],
          ),
        },
        status: 204,
      });
    } else {
      return extendResponse(resolver(ctx), { headers });
    }
  };
};
