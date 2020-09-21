import { ensureValid, compile, Schema } from '@ovotech/json-schema';
import * as commander from 'commander';
import * as fs from 'fs';
import * as YAML from 'yaml';
import { openapiV3 } from 'openapi-schemas';
import { OpenAPIObject } from 'openapi3-ts';
import { printDocument } from '@ovotech/ts-compose';
import { convertOapi } from './convert-oapi';
import { green, yellow } from 'chalk';
import { dirname } from 'path';

export const processFile = async (file: string): Promise<string> => {
  const { schema, refs } = await compile(file);
  const { value } = await ensureValid<OpenAPIObject>({
    schema: openapiV3 as Schema,
    value: schema,
    name: 'OpenAPI',
  });
  return printDocument(convertOapi({ root: value, refs }, value));
};

export interface Logger {
  info(args: unknown): void;
  error(args: unknown): void;
}

const toString = async (stream: NodeJS.ReadStream): Promise<string> => {
  let str = '';

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => (str += data.toString()));
    stream.on('end', () => resolve(str));
    stream.on('error', (error) => reject(error));
  });
};

const parseSchema = (type: string, content: string): Schema => {
  switch (type) {
    case 'json':
      return JSON.parse(content);
    case 'yaml':
      return YAML.parse(content);
    default:
      throw new Error(`Unknown STDIN type: ${type}, accepts only "json" and "yaml"`);
  }
};

export const axiosOapiCli = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('axios-oapi')
    .version('0.4.1')
    .description('Convert openapi schemas to typescript types for axios')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .option('-t, --stdin-type <type>', 'Type of STDIN data: "json" or "yaml"', 'json')
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, output, stdinType }) => {
      const input = file ? file : parseSchema(stdinType, await toString(process.stdin));
      const result = await processFile(input);

      if (output) {
        fs.mkdirSync(dirname(output), { recursive: true });
        logger.info(
          `OpanAPI Schema ${green(file ? file : 'STDIN')} -> ${yellow(output)} axios types`,
        );
        fs.writeFileSync(output, result);
      } else {
        process.stdout.write(result);
      }
    });
