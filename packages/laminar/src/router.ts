import { HttpError } from './HttpError';
import { Addition, Context, Method, Resolver, Route, RouteContext, RouteResolver } from './types';

export const paramRegEx = /\{[^\}]+\}/g;

export const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map(key => key.slice(1, -1)) : [];
};

export const toPathRe = (path: string) =>
  new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');

export const toPathMatcher = (path: string) => {
  const keys = toPathKeys(path);
  const re = toPathRe(path);

  return (ctx: Context): RouteContext | false => {
    const pathMatch = re.exec(ctx.url.pathname!);
    if (pathMatch) {
      return { path: pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {}) };
    }

    return false;
  };
};

export const toRouteMatcher = <C extends Addition = {}>(method: string, path: string) => {
  const methodMatcher = method.toUpperCase();
  const pathMatcher = toPathMatcher(path);
  return (ctx: C & Context) => ctx.method === methodMatcher && pathMatcher(ctx);
};

export const toRoute = <C extends Addition = {}>(
  method: string,
  path: string,
  resolver: Resolver<C & RouteContext>,
): Route<C> => ({
  matcher: toRouteMatcher(method, path),
  resolver,
});

export const selectRoute = <
  C extends Addition = {},
  CR extends Addition = {},
  R extends Route<CR> = Route<CR>
>(
  ctx: C & Context,
  routes: R[],
) => {
  for (const route of routes) {
    const params = route.matcher(ctx);
    if (params) {
      return { route, ...params };
    }
  }
  return false;
};

export const router = <C extends Addition = {}, RC extends Addition = {}>(
  ...routes: Array<Route<C>>
): Resolver<RC> => {
  return ctx => {
    const select = selectRoute(ctx, routes as Route[]);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname!} not found`,
      });
    }
    return select.route.resolver({ ...ctx, path: select.path });
  };
};

export const get: RouteResolver = (path, resolver) => toRoute(Method.GET, path, resolver);
export const post: RouteResolver = (path, resolver) => toRoute(Method.POST, path, resolver);
export const del: RouteResolver = (path, resolver) => toRoute(Method.DELETE, path, resolver);
export const patch: RouteResolver = (path, resolver) => toRoute(Method.PATCH, path, resolver);
export const put: RouteResolver = (path, resolver) => toRoute(Method.PUT, path, resolver);
export const options: RouteResolver = (path, resolver) => toRoute(Method.OPTIONS, path, resolver);
