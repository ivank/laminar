import { Matcher, MatcherParams, selectMatcher, toMatcher } from '../helpers/route';
import { message } from '../response';
import { Context, Method, Resolver } from '../types';

interface RouteMatcher<TContext extends Context> extends Matcher {
  resolver: Resolver<TContext>;
}

interface RouteContext {
  params: MatcherParams;
}

type Route = <TContext extends Context>(
  path: string,
  resolver: Resolver<TContext>,
) => RouteMatcher<TContext>;

export const routes = <TContext extends Context>(
  ...matchers: Array<RouteMatcher<TContext & RouteContext>>
): Resolver<TContext> => {
  return ctx => {
    const select = selectMatcher(ctx.method, ctx.path, matchers);

    if (!select) {
      return message(404, { message: `Path ${ctx.method} ${ctx.path} not found` });
    }
    return select.matcher.resolver({ ...ctx, params: select.params });
  };
};

export const get: Route = (path, resolver) => ({ ...toMatcher(Method.GET, path), resolver });
export const post: Route = (path, resolver) => ({ ...toMatcher(Method.POST, path), resolver });
export const del: Route = (path, resolver) => ({ ...toMatcher(Method.DELETE, path), resolver });
export const patch: Route = (path, resolver) => ({ ...toMatcher(Method.PATCH, path), resolver });
export const put: Route = (path, resolver) => ({ ...toMatcher(Method.PUT, path), resolver });
