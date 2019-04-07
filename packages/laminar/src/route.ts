import { HttpError } from './HttpError';
import {
  Context,
  Matcher,
  MatcherPath,
  Method,
  Resolver,
  Route,
  RouteContext,
  RouteMatcher,
} from './types';

export const paramRegEx = /\{[^\}]+\}/g;

export const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map(key => key.slice(1, -1)) : [];
};

export const toPathRe = (path: string) =>
  new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');

export const toMatcher = (method: string, path: string): Matcher => ({
  method: method.toUpperCase(),
  keys: toPathKeys(path),
  pathRe: toPathRe(path),
});

export const match = (method: string, path: string, matcher: Matcher) => {
  if (matcher.method === method) {
    const pathMatch = matcher.pathRe.exec(path);
    if (pathMatch) {
      const params: MatcherPath = pathMatch
        .slice(1)
        .reduce((all, val, i) => ({ [matcher.keys[i]]: val, ...all }), {});

      return params;
    }
  }

  return false;
};

export const selectMatcher = <TMatcher extends Matcher>(
  method: string,
  path: string,
  matchers: TMatcher[],
) => {
  for (const matcher of matchers) {
    const params = match(method, path, matcher);
    if (params) {
      return { matcher, path: params };
    }
  }
  return false;
};

export const routes = <TContext extends Context>(
  ...matchers: Array<RouteMatcher<TContext & RouteContext>>
): Resolver<TContext> => {
  return ctx => {
    const select = selectMatcher(ctx.method, ctx.url.pathname!, matchers);

    if (!select) {
      throw new HttpError(404, {
        message: `Path ${ctx.method} ${ctx.url.pathname!} not found`,
      });
    }
    return select.matcher.resolver({ ...ctx, path: select.path });
  };
};

export const get: Route = (path, resolver) => ({ ...toMatcher(Method.GET, path), resolver });
export const post: Route = (path, resolver) => ({ ...toMatcher(Method.POST, path), resolver });
export const del: Route = (path, resolver) => ({ ...toMatcher(Method.DELETE, path), resolver });
export const patch: Route = (path, resolver) => ({ ...toMatcher(Method.PATCH, path), resolver });
export const put: Route = (path, resolver) => ({ ...toMatcher(Method.PUT, path), resolver });
export const head: Route = (path, resolver) => ({ ...toMatcher(Method.HEAD, path), resolver });
