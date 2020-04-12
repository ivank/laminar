import {
  Context,
  Method,
  Resolver,
  Route,
  RouteContext,
  RouteHelper,
  RouteMatcher,
  DefaultRouteHelper,
} from './types';
import { message, file, response } from './response';
import { resolve, normalize, join } from 'path';
import { existsSync } from 'fs';

export const paramRegEx = /\{[^\}]+\}/g;
export const parentPathRegEx = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map((key) => key.slice(1, -1)) : [];
};

export const toPathRe = (path: string): RegExp =>
  new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');

export const toPathMatcher = (path: string): RouteMatcher => {
  const keys = toPathKeys(path);
  const re = toPathRe(path);

  return (ctx: Context): RouteContext | false => {
    if (!ctx.url.pathname) {
      return false;
    }

    const pathMatch = re.exec(ctx.url.pathname);
    if (pathMatch) {
      return { path: pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {}) };
    }

    return false;
  };
};

export const toRouteMatcher = <C extends object = {}>(
  method: string,
  path: string,
): RouteMatcher<C> => {
  const methodMatcher = method.toUpperCase();
  const pathMatcher = toPathMatcher(path);
  return (ctx: C & Context) => ctx.method === methodMatcher && pathMatcher(ctx);
};

export const toRoute = <C extends object = {}>(
  method: string,
  path: string,
  resolver: Resolver<C & RouteContext & Context>,
): Route<C> => ({
  matcher: toRouteMatcher(method, path),
  resolver,
});

export const selectRoute = <
  C extends object = {},
  CR extends object = {},
  R extends Route<CR> = Route<CR>
>(
  ctx: C & Context,
  routes: R[],
): false | { path: RouteContext['path']; route: R } => {
  for (const route of routes) {
    const params = route.matcher(ctx);
    if (params) {
      return { route, ...params };
    }
  }
  return false;
};

export const router = <C extends object = {}>(...routes: Route<C>[]): Resolver<C & Context> => {
  return (ctx) => {
    const select = selectRoute(ctx, routes as Route[]);

    if (!select) {
      return message(404, { message: `Path ${ctx.method} ${ctx.url.pathname} not found` });
    }
    return select.route.resolver({ ...ctx, path: select.path });
  };
};

export const get: RouteHelper = (path, resolver) => toRoute(Method.GET, path, resolver);
export const post: RouteHelper = (path, resolver) => toRoute(Method.POST, path, resolver);
export const del: RouteHelper = (path, resolver) => toRoute(Method.DELETE, path, resolver);
export const patch: RouteHelper = (path, resolver) => toRoute(Method.PATCH, path, resolver);
export const put: RouteHelper = (path, resolver) => toRoute(Method.PUT, path, resolver);
export const options: RouteHelper = (path, resolver) => toRoute(Method.OPTIONS, path, resolver);
export const defaultRoute: DefaultRouteHelper = (resolver) => ({
  resolver,
  matcher: () => ({ path: {} }),
});

export const staticDirectory = <C extends object = {}>(
  prefixPath: string,
  root: string,
): Route<C> => {
  return {
    matcher: (context) => {
      return [Method.GET, Method.HEAD].includes(context.method) &&
        context.url.pathname?.startsWith(prefixPath)
        ? { path: context.url.pathname }
        : false;
    },
    resolver: ({ path }) => {
      const relativePath = join('.', normalize(path).substring(prefixPath.length));

      if (parentPathRegEx.test(relativePath)) {
        return response({ status: 403 });
      }

      const filename = resolve(normalize(root), relativePath);

      return existsSync(filename) ? file(filename) : response({ status: 404 });
    },
  };
};
