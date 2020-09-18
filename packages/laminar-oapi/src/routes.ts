import { Empty, AppRequest } from '@ovotech/laminar';
import { toRequestSchema, toResponseSchema } from './oapi-to-schema';
import { ResolvedOpenAPIObject } from './resolved-openapi-object';
import { OapiPaths, Route, Matcher, OapiPath } from './types';

const paramRegEx = /\{[^\}]+\}/g;

const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map((key) => key.slice(1, -1)) : [];
};

const toPathRe = (path: string): RegExp =>
  new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');

const toMatcher = (path: string, method: string): Matcher => {
  const uppercaseMethod = method.toUpperCase();
  const keys = toPathKeys(path);
  const re = toPathRe(path);
  return (req) => {
    if (!req.url.pathname || uppercaseMethod !== req.method) {
      return false;
    }

    const pathMatch = re.exec(req.url.pathname);
    if (pathMatch) {
      return pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {});
    }

    return false;
  };
};

export const selectRoute = <T extends Empty = Empty>(
  req: T & AppRequest,
  routes: Route<T>[],
): false | { path: OapiPath; route: Route<T> } => {
  for (const route of routes) {
    const path = route.matcher(req);
    if (path) {
      return { route, path };
    }
  }
  return false;
};

export const toRoutes = <T extends Empty>(
  api: ResolvedOpenAPIObject,
  oapiPaths: OapiPaths<T>,
): Route<T>[] =>
  Object.entries(api.paths).reduce<Route<T>[]>((pathRoutes, [path, pathParameters]) => {
    const { parameters, summary, description, ...methods } = pathParameters;
    return [
      ...pathRoutes,
      ...Object.entries(methods).reduce<Route<T>[]>((methodRoutes, [method, operation]) => {
        return [
          ...methodRoutes,
          {
            request: toRequestSchema(api, operation, { parameters, summary, description }),
            response: toResponseSchema(operation),
            operation,
            security: operation.security || api.security,
            matcher: toMatcher(path, method),
            resolver: oapiPaths[path][method],
          },
        ];
      }, []),
    ];
  }, []);
