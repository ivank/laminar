import { ensureValid, compile, Schema } from '@ovotech/json-schema';
import * as commander from 'commander';
import * as fs from 'fs';
import * as YAML from 'js-yaml';
import { openapiV3 } from 'openapi-schemas';
import { oapiTs } from './convert';

export const processFile = async (file: string): Promise<string> => {
  const resolvedSchema = await compile(file);
  await ensureValid(openapiV3 as Schema, resolvedSchema.schema);
  return oapiTs(resolvedSchema);
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
      return YAML.load(content);
    default:
      throw new Error(`Unknown STDIN type: ${type}, accepts only "json" and "yaml"`);
  }
};

export const axiosOapiCli = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('axios-oapi')
    .version('0.1.0')
    .description('Convert openapi schemas to typescript types for axios')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .option('-t, --stdin-type <type>', 'Type of STDIN data: "json" or "yaml"', 'json')
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, output, stdinType }) => {
      const input = file ? file : parseSchema(stdinType, await toString(process.stdin));
      const result = await processFile(input);

      if (output) {
        logger.info(`Conterted ${file ? file : 'STDIN'} to ${output}`);
        fs.writeFileSync(output, result);
      } else {
        process.stdout.write(result);
      }
    });
