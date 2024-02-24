import { compile, ensureValid, Schema } from '@laminarjs/json-schema';
import { openapiV3, openapiV31 } from 'openapi-schemas';
import { oas31 } from 'openapi3-ts';
import { AstContext } from './traverse';
import * as YAML from 'yaml';

export const concatStreamToString = async (stream: NodeJS.ReadStream): Promise<string> => {
  let str = '';

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => (str += data.toString()));
    stream.on('end', () => resolve(str));
    stream.on('error', (error) => reject(error));
  });
};

export const toTitleCase = (str: string): string =>
  str
    .replace('_', ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    .replace(' ', '');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchMediaQuery = <T>(mediaType: string, resources: Record<string, T>): T | undefined => {
  const [base, type] = mediaType.split('/');
  const matcher = new RegExp(`^(${base}/\\w+\\+${escapeRegExp(type)})|${base}/\\*|\\*/\\*$`);
  const key = Object.keys(resources).find((key) => matcher.test(key));
  return key ? resources[key] : undefined;
};

export const findMediaType = <T>(mediaType: string, resources?: Record<string, T>): T | undefined =>
  resources ? resources[mediaType] ?? matchMediaQuery(mediaType, resources) : undefined;

/**
 * Compile an openapi schema, converting it into a context.
 * This context allows you to use it in conjuction with parts of the schema as
 * all the urls have been resolved and the validation can be done statically
 */
export const toContext = async (
  fileName: string,
): Promise<{ context: AstContext; uris: string[]; value: oas31.OpenAPIObject }> => {
  const { schema, uris, refs } = await compile(fileName);

  const openapiSchema =
    typeof schema === 'object' &&
    'openapi' in schema &&
    typeof schema.openapi === 'string' &&
    schema.openapi.startsWith('3.1')
      ? openapiV31
      : openapiV3;

  const { value } = await ensureValid<oas31.OpenAPIObject>({
    schema: openapiSchema as Schema,
    value: schema,
    name: 'OpenAPI',
  });

  return { context: { root: value, refs }, value, uris };
};

/**
 * Parse a string into a Schema object.
 * Supports 'json' and 'yaml'
 */
export const parseSchema = (type: 'json' | 'yaml', content: string): Schema => {
  switch (type) {
    case 'json':
      return JSON.parse(content);
    case 'yaml':
      return YAML.parse(content);
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
