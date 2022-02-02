import chalk from 'chalk';
import { Command, createCommand, Option } from 'commander';
import { mkdirSync, watchFile, writeFileSync } from 'fs';
import { convertOapi } from './convert';
import { printDocument } from '@ovotech/ts-compose';
import { dirname } from 'path';
import { Logger } from '../../types';
import { parseSchema, toContext, concatStreamToString } from '../../helpers';

export const processFile = async (fileName: string): Promise<{ content: string; uris: string[] }> => {
  const { context, uris, value } = await toContext(fileName);
  return { content: printDocument(convertOapi(context, value)), uris };
};

export const toFiles = (uris: string[]): string[] =>
  uris.filter((uri) => uri.startsWith('file://')).map((uri) => uri.substring('file://'.length));

export const apiCommand = (logger: Logger = console): Command =>
  createCommand('api')
    .description('Convert openapi schemas to typescript types')
    .option('-w, --watch', 'Watch for file changes and update live, required --file and --output options')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .addOption(new Option('-t, --stdin-type <type>', 'Type of STDIN data').default('json').choices(['json', 'yaml']))
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, output, stdinType, watch }) => {
      try {
        const input = file ? file : parseSchema(stdinType, await concatStreamToString(process.stdin));
        const { content, uris } = await processFile(input);

        if (output) {
          mkdirSync(dirname(output), { recursive: true });
          logger.info(`OpanAPI Schema ${chalk.green(file ? file : 'STDIN')} -> ${chalk.yellow(output)} laminar types`);
          writeFileSync(output, content);
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
            watchFile(trigger, async () => {
              try {
                const update = await processFile(file);
                writeFileSync(output, update.content);
                logger.info(
                  `Updated OpenAPI Schema ${chalk.green(output)} -> ${chalk.yellow(output)} (trigger ${trigger})`,
                );
              } catch (error) {
                logger.error(
                  chalk.red(
                    error instanceof Error ? (process.env.LAMINAR_DEBUG ? error.stack : error.message) : String(error),
                  ),
                );
              }
            }),
          );
        }
      } catch (error) {
        logger.error(
          chalk.red(error instanceof Error ? (process.env.LAMINAR_DEBUG ? error.stack : error.message) : String(error)),
        );
      }
    });
