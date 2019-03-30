export interface MatcherParams {
  [key: string]: string;
}

export interface Matcher {
  method: string;
  pathRe: RegExp;
  keys: string[];
}

export const paramRegEx = /\{[^\}]+\}/g;

export const toPathKeys = (path: string): string[] => {
  const keys = path.match(paramRegEx);
  return keys ? keys.map(key => key.slice(1, -1)) : [];
};

export const toPathRe = (path: string) =>
  new RegExp(path.replace('/', '\\/').replace(paramRegEx, '([^/]+)'));

export const toMatcher = (method: string, path: string): Matcher => ({
  method: method.toUpperCase(),
  keys: toPathKeys(path),
  pathRe: toPathRe(path),
});

export const match = (method: string, path: string, matcher: Matcher) => {
  if (matcher.method === method) {
    const pathMatch = matcher.pathRe.exec(path);
    if (pathMatch) {
      const params: MatcherParams = pathMatch
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
      return { matcher, params };
    }
  }
  return false;
};
