import { Readable } from 'stream';

export const concatStream = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
};

export const toArray = (value: string[] | string | number | false | undefined) =>
  Array.isArray(value) ? value : value ? [value] : [];

const setQuery = (path: string[], value: any, obj: any): any => {
  const [current, ...rest] = path;
  return current
    ? { ...obj, [current]: rest.length ? setQuery(rest, value, obj[current] || {}) : value }
    : toArray(rest.length ? setQuery(rest, value, obj) : value);
};

const toQueryPath = (key: string) => key.replace(/\]/g, '').split('[');

export const parseQueryObjects = (plain: { [key: string]: any }): any =>
  Object.entries(plain)
    .map(([key, val]) => [key, val.includes(',') ? val.split(',') : val])
    .reduce((all, [key, val]) => setQuery(toQueryPath(key), val, all), {});
