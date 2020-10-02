import { Schema } from '@ovotech/json-schema';
import * as commander from 'commander';
import * as fs from 'fs';
import * as YAML from 'yaml';
import { printDocument } from '@ovotech/ts-compose';
import { convertOapi } from './convert';
import { green, yellow } from 'chalk';
import { dirname } from 'path';
import { Logger } from '../../types';
import { toContext, toString } from '../../helpers';

export const processFile = async (file: string): Promise<string> => {
  const { context, value } = await toContext(file);
  return printDocument(convertOapi(context, value));
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

export const axiosCommand = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('axios')
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
