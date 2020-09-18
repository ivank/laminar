import { Component } from '../types';
import { toArray } from '../helpers';
import { URLSearchParams } from 'url';

type Obj = Record<string, unknown>;

const isObj = (obj: unknown): obj is Obj => typeof obj === 'object' && obj !== null;

const setQuery = (path: string[], value: unknown, obj: Obj): Obj | unknown[] => {
  const [current, ...rest] = path;
  if (current) {
    const currentValue = obj[current];
    return {
      ...obj,
      [current]: rest.length
        ? Array.isArray(currentValue)
          ? [...currentValue, value]
          : setQuery(rest, value, isObj(currentValue) ? currentValue : {})
        : value,
    };
  } else {
    return toArray(rest.length ? setQuery(rest, value, obj) : value);
  }
};

const toQueryPath = (key: string): string[] => key.replace(/\]/g, '').split('[');

export const parseQueryObjects = (searchParams: URLSearchParams): Obj =>
  [...searchParams.entries()]
    .map<[string, unknown]>(([key, val]) => [
      key,
      typeof val === 'string' && val.includes(',') ? val.split(',') : val,
    ])
    .reduce((all, [key, val]) => setQuery(toQueryPath(key), val, all), {});

export interface RequestQuery {
  query: any;
}

export const queryParserComponent = (): Component<RequestQuery> => (next) => (req) => {
  const queryString = req.incommingMessage.url?.split('?')?.[1] ?? '';
  return next({ ...req, query: parseQueryObjects(new URLSearchParams(queryString)) });
};
