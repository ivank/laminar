/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve, normalize, join } from 'path';
import { existsSync, statSync } from 'fs';
import { file, jsonNotFound, textNotFound, textForbidden } from './response';
import { HttpContext, HttpListener } from './types';
import { Empty } from '../types';
import { toPathKeys, toPathRe } from '../helpers';

/**
 * Adds the `path` property to the request, containing the captured path parameters.
 *
 * @category http
 */
export interface RouteContext {
  /**
   * Captured path parameters to the route.
   *
   * If the route has a {some_name} in it it would be captured into `some_name` property.
   * If the route is a RegExp, would pass the capture groups as an array.
   */
  path: any;
}

/**
 * A function to check if a route matches. If it does, returns the captured path parameters, otherwise - false.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export type Matcher<TContext> = (ctx: TContext & HttpContext) => RouteContext | false;

/**
 * Captured path parameters to the route would be passed to the `path` property.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export type AppRoute<TContext extends Empty = Empty> = HttpListener<TContext & RouteContext>;

/**
 * A route object, containing a route mather and the route application
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export interface PathRoute<TContext extends Empty> {
  matcher: Matcher<TContext>;
  listener: AppRoute<TContext>;
}

/**
 * An options for a route
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export interface PathRouteOptions<TContext extends Empty> {
  /**
   * The http method to match. If omitted will match any method.
   */
  method?: string;
  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` parameters.
   * You can have multiple parameters in the path, all of them will be extracted.
   *
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes.
   */
  path: string | RegExp;

  /**
   * Would pass the captured path parameters to the `path` property
   */
  listener: HttpListener<TContext & RouteContext>;
}

/**
 * A route function to be called on a specific method and path.
 *
 * Used by:
 *
 * - {@link get}
 * - {@link post}
 * - {@link del}
 * - {@link patch}
 * - {@link put}
 * - {@link options}
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export type Method = <TContext extends Empty = Empty>(
  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` parameters.
   * You can have multiple parameters in the path, all of them will be extracted.
   *
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes.
   */
  path: string | RegExp,

  /**
   * Would pass the captured path parameters to the `path` property
   */
  listener: HttpListener<TContext & RouteContext>,
) => PathRoute<TContext>;

/**
 * Options for {@link staticAssets}
 * @category http
 */
export interface StaticAssetsOptions {
  /**
   * If it is set to false, no Accept-Ranges header would be sent and the Range request headers would not be used. Defaults to true
   */
  acceptRanges?: boolean;
  /**
   * If a directory is requested, it would attempt to load this file inside of that directory. Defaults to index.html
   * To disable it set to undefined
   */
  index?: string;
  /**
   * Would be called if a file was not found at all.
   */
  fileNotFound?: HttpListener;
  /**
   * Would be called if a directory was requested, but index file was not found (or was disabled with `index: undefined`).
   */
  indexNotFound?: HttpListener;
}

/**
 * A generic route function. If you omit the method, would match any method.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export const route = <TContext extends Empty = Empty>({
  method,
  path,
  listener,
}: PathRouteOptions<TContext>): PathRoute<TContext> => {
  const keys = typeof path === 'string' ? toPathKeys(path) : undefined;
  const re = typeof path === 'string' ? toPathRe(path) : path;
  const uppercaseMethod = method?.toUpperCase();

  const matcher: Matcher<TContext> = (ctx) => {
    if (!ctx.url || (uppercaseMethod && uppercaseMethod !== ctx.method)) {
      return false;
    }

    const pathMatch = re.exec(ctx.url.pathname);
    if (pathMatch) {
      return {
        path: keys ? pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {}) : pathMatch.slice(1),
      };
    }

    return false;
  };

  return { matcher, listener };
};

/**
 * If the route's matcher matches the current request,
 * extract the path parameters and return them along with the matched route's listener
 *
 * @param ctx
 * @param routes An array of routes to be checked sequentially
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
const selectRoute = <TContext extends Empty = Empty>(
  ctx: TContext & HttpContext,
  routes: (PathRoute<TContext> | AppRoute<TContext>)[],
): false | { path: any; listener: HttpListener<TContext & RouteContext> } => {
  for (const route of routes) {
    if ('matcher' in route) {
      const params = route.matcher(ctx);
      if (params) {
        return { listener: route.listener, ...params };
      }
    } else {
      return { listener: route, path: {} };
    }
  }
  return false;
};

/**
 * Use different routes to call different parts of the application.
 *
 * If you have route parameter in the path, like `/test1/{id}` would pass them down in the `path` property of the request.
 *
 * ```typescript
 * const listener:App = router(
 *   get('/route1/{id}', ({ path: { id }}) => {
 *     // ...
 *   }),
 *   post('/other-route', ({ body }) => {
 *     // ...
 *   })
 * )
 * ```
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 * @category http
 */
export function router<TContext extends Empty = Empty>(
  ...routes: (PathRoute<TContext> | AppRoute<TContext>)[]
): HttpListener<TContext> {
  return async (ctx) => {
    const selected = selectRoute<TContext>(ctx, routes);
    return selected
      ? selected.listener({ ...ctx, path: selected.path })
      : jsonNotFound({ message: `Path ${ctx.method} ${ctx.url.pathname} not found` });
  };
}

/**
 * Create a listener for a specific method (GET), used by {@link router}
 * @category http
 */
export const get: Method = (path, listener) => route({ method: 'GET', path, listener });

/**
 * Create a listener for a specific method (POST), used by {@link router}
 * @category http
 */
export const post: Method = (path, listener) => route({ method: 'POST', path, listener });

/**
 * Create a listener for a specific method (DEL), used by {@link router}
 * @category http
 */
export const del: Method = (path, listener) => route({ method: 'DELETE', path, listener });

/**
 * Create a listener for a specific method (PATCH), used by {@link router}
 * @category http
 */
export const patch: Method = (path, listener) => route({ method: 'PATCH', path, listener });

/**
 * Create a listener for a specific method (PUT), used by {@link router}
 * @category http
 */
export const put: Method = (path, listener) => route({ method: 'PUT', path, listener });

/**
 * Create a listener for a specific method (OPTIONS), used by {@link router}
 * @category http
 */
export const options: Method = (path, listener) => route({ method: 'OPTIONS', path, listener });

/**
 * Validate if a filename is attempting to a file outside of the root
 */
const parentPathRegEx = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

/**
 * You can serve a directory of static assets with `staticAssets` helper.
 *
 * @param prefixPath The pathname where the directory would be located, example: '/assets'
 * @param root The directory containing the files
 * @param param2 Options
 *
 * @category http
 */
export function staticAssets<T extends Empty = Empty>(
  prefixPath: string,
  root: string,
  {
    index = 'index.html',
    acceptRanges = true,
    indexNotFound = async () => textNotFound('Index file not found'),
    fileNotFound = async () => textNotFound('File not found'),
  }: StaticAssetsOptions = {},
): PathRoute<T> {
  const allowedMethods = ['GET', 'HEAD'];

  return {
    matcher: (ctx) => {
      return allowedMethods.includes(ctx.incomingMessage.method ?? '') &&
        ctx.incomingMessage.url?.startsWith(prefixPath)
        ? { path: {} }
        : false;
    },
    listener: async (ctx) => {
      const relativePath = join('.', normalize(ctx.incomingMessage.url ?? '').substring(prefixPath.length));

      if (parentPathRegEx.test(relativePath)) {
        return textForbidden('Access Denied');
      }

      const filename = resolve(normalize(root), relativePath);
      const incomingMessage = acceptRanges ? ctx.incomingMessage : undefined;

      if (existsSync(filename)) {
        const stats = statSync(filename);
        if (stats.isDirectory()) {
          if (index) {
            const indexName = join(filename, index);
            if (existsSync(indexName)) {
              return file(indexName, { incomingMessage });
            }
          }
          return indexNotFound(ctx);
        } else {
          return file(filename, { incomingMessage, stats });
        }
      } else {
        return fileNotFound(ctx);
      }
    },
  };
}
