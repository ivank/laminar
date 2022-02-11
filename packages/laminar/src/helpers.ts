import { URLSearchParams } from 'url';

/**
 * Convert an value to an array `[value]`. If its already an array, keep it as is
 */
export function toArray<T = unknown>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

type Obj = Record<string, unknown>;

const isObj = (obj: unknown): obj is Obj => typeof obj === 'object' && obj !== null;
const isPrimitive = (obj: unknown): obj is string => obj !== undefined && !(typeof obj === 'object');

const setQuery = (path: string[], value: unknown, obj: any): Obj | unknown[] => {
  const [current, ...rest] = path;
  if (current && !/^\d+$/.test(current)) {
    const currentValue = obj[current];
    return {
      ...obj,
      [current]: Array.isArray(currentValue)
        ? rest.length > 1
          ? [
              ...currentValue.slice(0, Number(rest[0])),
              setQuery(rest.slice(1), value, currentValue[Number(rest[0])]),
              ...currentValue.slice(Number(rest[0]) + 1),
            ]
          : [...currentValue, value]
        : rest.length
        ? setQuery(rest, value, isObj(currentValue) ? currentValue : {})
        : isPrimitive(currentValue)
        ? [currentValue, value]
        : value,
    };
  } else {
    return toArray(rest.length ? setQuery(rest, value, obj) : value);
  }
};

const toQueryPath = (key: string): string[] => key.replace(/\]/g, '').split('[');

/**
 * Convert a URLSearchParams into a nested object.
 * Supports ',' separateros as well as a[a][b] like names to build nested objects and arrays
 */
export const parseQueryObjects = (searchParams: URLSearchParams): Obj =>
  [...searchParams.entries()]
    .map<[string, unknown]>(([key, val]) => [key, typeof val === 'string' && val.includes(',') ? val.split(',') : val])
    .reduce((all, [key, val]) => setQuery(toQueryPath(key), val, all), {});

/**
 * Check if a number is between two other numbers, inclusive
 */
function isInRange(from: number, to: number, num: number): boolean {
  return num >= from && num <= to;
}

/**
 * Denote a range between two numbers.
 */
export type Range = { start: number; end: number };

/**
 * Convert a [Range header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range) to a {@link Range} object.
 * Also vaidates against total length and return undefined if the range is outside of it.
 *
 * @param range a Range Header
 * @param totalLength maximum lenght the range can fall into, usually the file byte length
 */
export function parseRange(range: string, totalLength: number): Range | undefined {
  const fullRange = range.match(/^bytes=(\d+)-(\d+)/);
  if (fullRange) {
    const range: Range = { start: Number(fullRange[1]), end: Number(fullRange[2]) };

    if (!isInRange(0, totalLength, range.start) || !isInRange(0, totalLength, range.end)) {
      return undefined;
    }
    return range;
  }

  const startRange = range.match(/^bytes=(\d+)-$/);
  if (startRange) {
    const range: Range = { start: Number(startRange[1]), end: totalLength };
    return isInRange(0, totalLength, range.start) ? range : undefined;
  }

  const endRange = range.match(/^bytes=-(\d+)$/);
  if (endRange) {
    const range: Range = { start: 0, end: Number(endRange[1]) };
    return isInRange(0, totalLength, range.end) ? range : undefined;
  }
  return undefined;
}

/**
 * Escape a string to be placed inside of a RegEx
 */
function escapeRegExp(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Convert a [Media Type matcher from OpenAPI](https://swagger.io/docs/specification/media-types/) to a RegExp string
 * @param match
 */
export function toMatchPattern(match: string): string {
  return match
    .split('/')
    .map((part) => (part === '*' ? '[^\\/]*' : escapeRegExp(part)))
    .join('\\/');
}

/**
 * Convert path paramters (like `/test1/{id}`) into a regex
 */
const paramRegEx = /\{[^\}]+\}/g;

/**
 * Convert path parameters to keys. `/test1/{id}/{other}` -> ['id','other']
 */
export function toPathKeys(path: string): string[] {
  const keys = path.match(paramRegEx);
  return keys ? keys.map((key) => key.slice(1, -1)) : [];
}

/**
 * Convert path paramters (like `/test1/{id}`) into a regex that would extract the parameters as capture groups
 */
export function toPathRe(path: string): RegExp {
  return new RegExp('^' + path.replace('/', '\\/').replace(paramRegEx, '([^/]+)') + '/?$');
}

/**
 * Deeply convert one typescript type to another, following nested objects and arrays
 *
 * ```typescript
 * interface MyType {
 *   date: Date;
 * }
 *
 * type JsonMyTpe = Json<MyType>
 *
 * // JsonMyTpe['date'] will be string
 * ```
 */
export type Json<T> = T extends Date
  ? string
  : T extends string | number | boolean | null | undefined
  ? T
  : T extends Buffer
  ? { type: 'Buffer'; data: number[] }
  : {
      [K in keyof T]: T[K] extends (infer U)[] ? Json<U>[] : Json<T[K]>;
    };

/**
 * Convert a javascript object into a JSON plain object.
 * Serializes Dates into strings and removes keys with undefined values
 *
 * ```typescript
 * const a = toJson({ date: new Date(), test: undefined });
 *
 * // a will be { date: '2020-01 ...' };
 * ```
 */
export function toJson<T>(data: T): Json<T> {
  if (data !== null && typeof data === 'object') {
    if (data instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.toISOString() as any;
    } else if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any).map(toJson) as any;
    } else {
      return Object.entries(data).reduce(
        (acc, [key, value]) => (value === undefined ? acc : { ...acc, [key]: toJson(value) }),
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any;
  }
}
