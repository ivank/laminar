export const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value ? [value] : [];

type Obj = Record<string, unknown>;

const isObj = (obj: unknown): obj is Obj => typeof obj === 'object' && obj !== null;

const setQuery = (path: string[], value: unknown, obj: Obj): Obj | unknown[] => {
  const [current, ...rest] = path;
  if (current) {
    const currentValue = obj[current];
    return {
      ...obj,
      [current]: rest.length
        ? setQuery(rest, value, isObj(currentValue) ? currentValue : {})
        : value,
    };
  } else {
    return toArray(rest.length ? setQuery(rest, value, obj) : value);
  }
};

const toQueryPath = (key: string): string[] => key.replace(/\]/g, '').split('[');

export const parseQueryObjects = (plain: Obj): Obj =>
  Object.entries(plain)
    .map<[string, unknown]>(([key, val]) => [
      key,
      typeof val === 'string' && val.includes(',') ? val.split(',') : val,
    ])
    .reduce((all, [key, val]) => setQuery(toQueryPath(key), val, all), {});
