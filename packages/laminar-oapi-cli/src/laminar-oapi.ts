import { compile, validate, Schema, ResolveError } from '@ovotech/json-schema';
import * as commander from 'commander';
import * as fs from 'fs';
import { openapiV3 } from 'openapi-schemas';
import { oapiTs } from './convert';
import { OapiValidationError } from './OapiValidationError';

export const processFile = async (
  fileName: string,
): Promise<{ content: string; uris: string[] }> => {
  const { schema, uris } = await compile(fileName);
  const check = await validate({ schema: openapiV3 as Schema, value: schema });

  if (!check.valid) {
    throw new OapiValidationError('Invalid API Definition', check.errors);
  }

  return { content: await oapiTs(fileName), uris };
};

export const formatErrorMessage = (error: Error): string | Error => {
  if (error instanceof OapiValidationError) {
    return new Error(`-----\n${error.toString()}`);
  } else if (error instanceof ResolveError) {
    return new Error(`-----\nError: Cannot resolve api references\n |${error.message}`);
  } else {
    return error;
  }
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
    .version('0.5.4')
    .description('Convert openapi schemas to typescript types')
    .option('-w, --watch', 'Watch for file changes and update live')
    .arguments('<input-file> <output-file>')
    .action(async (inputFile, outputFile, { watch }) => {
      try {
        const { content, uris } = await processFile(inputFile);
        fs.writeFileSync(outputFile, content);
        logger.info(`Conterted ${inputFile} -> ${outputFile}`);

        if (watch) {
          logger.info(`Watching ${toFiles(uris).join(', ')} for changes`);

          toFiles(uris).forEach((file) =>
            fs.watchFile(file, async () => {
              try {
                const update = await processFile(inputFile);
                fs.writeFileSync(outputFile, update.content);
                logger.info(`Updated ${inputFile} -> ${outputFile} (trigger ${file})`);
              } catch (error) {
                throw formatErrorMessage(error);
              }
            }),
          );
        }
      } catch (error) {
        throw formatErrorMessage(error);
      }
    });
