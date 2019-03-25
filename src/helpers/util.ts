interface Subject {
  [key: string]: any;
}

export const pushIn = <T extends Subject>(path: string[], value: any, obj: T): T => {
  const [current, ...rest] = path;
  return {
    ...obj,
    [current]: rest.length
      ? pushIn(rest, value, obj[current] || {})
      : [...(obj[current] || []), value],
  };
};

export const push = <T extends Subject>(path: string[], value: any) => (obj: T) =>
  pushIn(path, value, obj);

export const setIn = <T extends Subject>(path: string[], value: any, obj: T): T => {
  const [current, ...rest] = path;
  return { ...obj, [current]: rest.length ? setIn(rest, value, obj[current] || {}) : value };
};

export const set = <T extends Subject>(path: string[], value: any) => (obj: T) =>
  setIn(path, value, obj);

export const flow = <T extends Subject>(...args: Array<(obj: T) => T>) => (obj: T) =>
  args.reduce((result, current) => current(result), obj);

export const noop = <T extends Subject>(obj: T) => obj;

export const isMatchingType = (type: string, matchType: string): boolean => {
  const [major, sub] = type.split('/');
  const [matchMajor, matchSub] = matchType.split('/');
  return (major === '*' || major === matchMajor) && (sub === '*' || sub === matchSub);
};

export const toArray = (value: string[] | string | number | false | undefined) =>
  Array.isArray(value) ? value : value ? [value] : [];
