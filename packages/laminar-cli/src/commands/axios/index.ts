import { Command, createCommand, Option } from 'commander';
import fs from 'fs';
import { printDocument } from '@ovotech/ts-compose';
import { convertOapi } from './convert';
import { green, yellow } from 'chalk';
import { dirname } from 'path';
import { Logger } from '../../types';
import { toContext, concatStreamToString, parseSchema } from '../../helpers';

export const processFile = async (file: string): Promise<string> => {
  const { context, value } = await toContext(file);
  return printDocument(convertOapi(context, value));
};

export const axiosCommand = (logger: Logger = console): Command =>
  createCommand('axios')
    .description('Convert openapi schemas to typescript types for axios')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .addOption(new Option('-t, --stdin-type <type>', 'Type of STDIN data').default('json').choices(['json', 'yaml']))
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, output, stdinType }) => {
      const input = file ? file : parseSchema(stdinType, await concatStreamToString(process.stdin));
      const result = await processFile(input);

      if (output) {
        fs.mkdirSync(dirname(output), { recursive: true });
        logger.info(`OpanAPI Schema ${green(file ? file : 'STDIN')} -> ${yellow(output)} axios types`);
        fs.writeFileSync(output, result);
      } else {
        process.stdout.write(result);
      }
    });
