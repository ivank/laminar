import { compile, ensureValid, Schema } from '@ovotech/json-schema';
import { openapiV3 } from 'openapi-schemas';
import { OpenAPIObject } from 'openapi3-ts';
import { AstContext } from './traverse';
import * as YAML from 'yaml';

export const toString = async (stream: NodeJS.ReadStream): Promise<string> => {
  let str = '';

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => (str += data.toString()));
    stream.on('end', () => resolve(str));
    stream.on('error', (error) => reject(error));
  });
};

export const toContext = async (
  fileName: string,
): Promise<{ context: AstContext; uris: string[]; value: OpenAPIObject }> => {
  const { schema, uris, refs } = await compile(fileName);
  const { value } = await ensureValid<OpenAPIObject>({
    schema: openapiV3 as Schema,
    value: schema,
    name: 'OpenAPI',
  });

  return { context: { root: value, refs }, value, uris };
};

export const parseSchema = (type: string, content: string): Schema => {
  switch (type) {
    case 'json':
      return JSON.parse(content);
    case 'yaml':
      return YAML.parse(content);
    default:
      throw new Error(`Unknown STDIN type: ${type}, accepts only "json" and "yaml"`);
  }
};

/**
 * regex for matching ANSI escape codes.
 *
 * Example:
 *
 * ```js
 *  '\u001B[4mcake\u001B[0m'.match(ansiRegex); => ['\u001B[4m', '\u001B[0m']
 * ```
 * Source: https://github.com/chalk/ansi-regex#readme
 */
export const ansiRegex = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|'),
  'g',
);
