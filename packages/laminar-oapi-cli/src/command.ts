import { compile, validate, Schema } from '@ovotech/json-schema';
import { ResolveError } from '@ovotech/json-refs';
import { Command } from 'commander';
import * as fs from 'fs';
import { openapiV3 } from 'openapi-schemas';
import { oapiTs } from './convert';
import { OapiValidationError } from './OapiValidationError';

export const processFile = async (
  fileName: string,
): Promise<{ content: string; uris: string[] }> => {
  const { schema, uris } = await compile(fileName);
  const check = await validate(openapiV3 as Schema, schema);

  if (!check.valid) {
    throw new OapiValidationError('Invalid API Definition', check.errors);
  }

  return { content: await oapiTs(fileName), uris };
};

export const errorMessage = (error: Error): string | Error => {
  if (error instanceof OapiValidationError) {
    return `-----\n${error.toString()}`;
  } else if (error instanceof ResolveError) {
    return `-----\nError: Cannot resolve api references\n |${error.message}`;
  } else {
    return error;
  }
};

export const toFiles = (uris: string[]): string[] =>
  uris.filter(uri => uri.startsWith('file://')).map(uri => uri.substring('file://'.length));

new Command()
  .description('Convert openapi schemas to typescript types')
  .option('-w, --watch', 'Watch for file changes and update live')
  .arguments('<input-file> <output-file>')
  .action(async (inputFile, outputFile, { watch }) => {
    try {
      const { content, uris } = await processFile(inputFile);
      fs.writeFileSync(outputFile, content);
      console.log(`Conterted ${inputFile} -> ${outputFile}`);

      if (watch) {
        console.log(`Watching ${toFiles(uris).join(', ')} for changes`);

        toFiles(uris).forEach(file =>
          fs.watchFile(file, async () => {
            try {
              const update = await processFile(inputFile);
              fs.writeFileSync(outputFile, update.content);
              console.log(`Updated ${inputFile} -> ${outputFile} (trigger ${file})`);
            } catch (error) {
              console.error(errorMessage(error));
              process.exit(1);
            }
          }),
        );
      }
    } catch (error) {
      console.error(errorMessage(error));
      process.exit(1);
    }
  })
  .parse(process.argv);
