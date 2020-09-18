import { resolve, normalize, join } from 'path';
import { existsSync } from 'fs';
import { jsonForbidden, file, jsonNotFound } from '../response';
import { AppRequest, App } from '../components/app.component';
import { Empty } from '../types';

export interface RequestRoute {
  path: any;
}

type Matcher<T> = (req: T & AppRequest) => RequestRoute | false;

export type AppRoute<T extends Empty = Empty> = App<T & RequestRoute>;

interface PathRoute<T extends Empty> {
  matcher: Matcher<T>;
  resolver: AppRoute<T>;
}

interface PathRouteOptions<T extends Empty> {
  method: string;
  path: string | RegExp;
  resolver: App<T & RequestRoute>;
}

export type Method = <T extends Empty = Empty>(
  path: string | RegExp,
  resolver: App<T & RequestRoute>,
) => PathRoute<T>;

const paramRegEx = /\{[^\}]+\}/g;
const parentPathRegEx = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map((key) => key.slice(1, -1)) : [];
};

const toPathRe = (path: string): RegExp =>
  new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');

const toPathRoute = <T extends Empty = Empty>({
  method,
  path,
  resolver,
}: PathRouteOptions<T>): PathRoute<T> => {
  const keys = typeof path === 'string' ? toPathKeys(path) : undefined;
  const re = typeof path === 'string' ? toPathRe(path) : path;
  const uppercaseMethod = method.toUpperCase();

  const matcher: Matcher<T> = (req) => {
    if (!req.url || uppercaseMethod !== req.method) {
      return false;
    }

    const pathMatch = re.exec(req.url.pathname);
    if (pathMatch) {
      return {
        path: keys
          ? pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {})
          : pathMatch.slice(1),
      };
    }

    return false;
  };

  return { matcher, resolver };
};

const selectRoute = <T extends Empty = Empty>(
  req: T & AppRequest,
  routes: (PathRoute<T> | AppRoute<T>)[],
): false | { path: any; resolver: App<T & RequestRoute> } => {
  for (const route of routes) {
    if ('matcher' in route) {
      const params = route.matcher(req);
      if (params) {
        return { resolver: route.resolver, ...params };
      }
    } else {
      return { resolver: route, path: {} };
    }
  }
  return false;
};

export const router = <T extends Empty = Empty>(
  ...routes: (PathRoute<T> | AppRoute<T>)[]
): App<T> => (req) => {
  const selected = selectRoute<T>(req, routes);
  return selected
    ? selected.resolver({ ...req, path: selected.path })
    : jsonNotFound({ message: `Path ${req.method} ${req.url.pathname} not found` });
};

export const get: Method = (path, resolver) => toPathRoute({ method: 'GET', path, resolver });
export const post: Method = (path, resolver) => toPathRoute({ method: 'POST', path, resolver });
export const del: Method = (path, resolver) => toPathRoute({ method: 'DELETE', path, resolver });
export const patch: Method = (path, resolver) => toPathRoute({ method: 'PATCH', path, resolver });
export const put: Method = (path, resolver) => toPathRoute({ method: 'PUT', path, resolver });
export const options: Method = (path, resolver) =>
  toPathRoute({ method: 'OPTIONS', path, resolver });

export const directory = <T extends Empty = Empty>(
  prefixPath: string,
  root: string,
): PathRoute<T> => {
  const allwoedMethods = ['GET', 'HEAD'];

  return {
    matcher: (req) => {
      return allwoedMethods.includes(req.incommingMessage.method ?? '') &&
        req.incommingMessage.url?.startsWith(prefixPath)
        ? { path: {} }
        : false;
    },
    resolver: ({ incommingMessage }) => {
      const relativePath = join(
        '.',
        normalize(incommingMessage.url ?? '').substring(prefixPath.length),
      );

      if (parentPathRegEx.test(relativePath)) {
        return jsonForbidden({ message: 'Access Denied' });
      }

      const filename = resolve(normalize(root), relativePath);

      return existsSync(filename)
        ? file(filename)
        : jsonNotFound({ message: 'File not found' }, { status: 404 });
    },
  };
};
