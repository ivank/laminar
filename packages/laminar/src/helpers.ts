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

export const deepQueryObjects = (plain: { [key: string]: any }): any => {
  return Object.entries(plain).reduce((all, [key, val]) => {
    // key
    //   .replace(/\]/g, '')
    //   .split('[')
    //   .reduce((current, path) => ({ current[path]: nested }), val);

    let name = '';
    let current = val;
    if (key.includes(']') && key.includes('[')) {
      for (const char of key) {
        if (char === '[') {
          current = { [name]: current };
          name = '';
        } else if (char === ']') {
          if (name) {
            current = { [name]: current };
            name = '';
          } else {
            current = [current];
          }
        } else {
          name += char;
        }
      }
    } else {
      current = { [key]: current };
    }

    return { ...all, ...current };
  }, {});
};
