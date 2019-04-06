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
