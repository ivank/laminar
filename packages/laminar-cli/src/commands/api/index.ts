import { green, red, yellow } from 'chalk';
import * as commander from 'commander';
import * as fs from 'fs';
import { convertOapi } from './convert';
import { printDocument } from '@ovotech/ts-compose';
import { dirname } from 'path';
import { Logger } from '../../types';
import { parseSchema, toContext, toString } from '../../helpers';

export const processFile = async (fileName: string): Promise<{ content: string; uris: string[] }> => {
  const { context, uris, value } = await toContext(fileName);
  return { content: printDocument(convertOapi(context, value)), uris };
};

export const toFiles = (uris: string[]): string[] =>
  uris.filter((uri) => uri.startsWith('file://')).map((uri) => uri.substring('file://'.length));

export const apiCommand = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('api')
    .description('Convert openapi schemas to typescript types')
    .option('-w, --watch', 'Watch for file changes and update live, required --file and --output options')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .option('-t, --stdin-type <type>', 'Type of STDIN data: "json" or "yaml"', 'json')
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, output, stdinType, watch }) => {
      try {
        const input = file ? file : parseSchema(stdinType, await toString(process.stdin));
        const { content, uris } = await processFile(input);

        if (output) {
          fs.mkdirSync(dirname(output), { recursive: true });
          logger.info(`OpanAPI Schema ${green(file ? file : 'STDIN')} -> ${yellow(output)} laminar types`);
          fs.writeFileSync(output, content);
        } else {
          process.stdout.write(content);
        }

        if (watch) {
          logger.info(`Watching ${toFiles(uris).join(', ')} for changes`);

          if (!file) {
            throw new Error('--file option is required, --watch can be used only with --file and --output');
          }

          if (!output) {
            throw new Error('--output option is required, --watch can be used only with --file and --output');
          }

          toFiles(uris).forEach((trigger) =>
            fs.watchFile(trigger, async () => {
              try {
                const update = await processFile(file);
                fs.writeFileSync(output, update.content);
                logger.info(`Updated OpenAPI Schema ${green(output)} -> ${yellow(output)} (trigger ${trigger})`);
              } catch (error) {
                logger.error(red(error.message));
              }
            }),
          );
        }
      } catch (error) {
        logger.error(red(error.message));
      }
    });
