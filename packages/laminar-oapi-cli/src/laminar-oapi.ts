import { compile, Schema, ensureValid } from '@ovotech/json-schema';
import { green, red, yellow } from 'chalk';
import * as commander from 'commander';
import * as fs from 'fs';
import { openapiV3 } from 'openapi-schemas';
import { OpenAPIObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { printDocument } from '@ovotech/ts-compose';
import { dirname } from 'path';

export const processFile = async (
  fileName: string,
): Promise<{ content: string; uris: string[] }> => {
  const { schema, uris, refs } = await compile(fileName);
  const { value } = await ensureValid<OpenAPIObject>({
    schema: openapiV3 as Schema,
    value: schema,
    name: 'OpenAPI',
  });

  return {
    content: printDocument(convertOapi({ root: value, refs }, value)),
    uris,
  };
};

export const toFiles = (uris: string[]): string[] =>
  uris.filter((uri) => uri.startsWith('file://')).map((uri) => uri.substring('file://'.length));

export interface Logger {
  info(args: unknown): void;
  error(args: unknown): void;
}

export const laminarOapi = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('laminar-oapi')
    .version('0.6.0')
    .description('Convert openapi schemas to typescript types')
    .option('-w, --watch', 'Watch for file changes and update live')
    .arguments('<input-file> <output-file>')
    .action(async (inputFile, outputFile, { watch }) => {
      try {
        const { content, uris } = await processFile(inputFile);
        fs.mkdirSync(dirname(outputFile), { recursive: true });
        fs.writeFileSync(outputFile, content);
        logger.info(
          `OpenAPI Schema ${green(inputFile)} -> ${yellow(outputFile)} laminar-oapi Types`,
        );

        if (watch) {
          logger.info(`Watching ${toFiles(uris).join(', ')} for changes`);

          toFiles(uris).forEach((file) =>
            fs.watchFile(file, async () => {
              try {
                const update = await processFile(inputFile);
                fs.writeFileSync(outputFile, update.content);
                logger.info(
                  `Updated OpenAPI Schema ${green(inputFile)} -> ${yellow(
                    outputFile,
                  )} (trigger ${file})`,
                );
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
