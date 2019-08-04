import { compile, validate } from '@ovotech/json-schema';
import { Schema } from '@ovotech/json-refs';
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

export const toFiles = (uris: string[]): string[] =>
  uris.filter(uri => uri.startsWith('file://')).map(uri => uri.substring('file://'.length));

new Command()
  .description('Convert openapi schemas to typescript types')
  .option('-w, --watch', 'Watch for file changes and update live')
  .arguments('<input-file> <output-file>')
  .action(async (inputFile, outputFile, { watch }) => {
    const { content, uris } = await processFile(inputFile);
    fs.writeFileSync(outputFile, content);
    process.stdout.write(`Conterted ${inputFile} -> ${outputFile}\n`);

    if (watch) {
      process.stdout.write(`Watching ${toFiles(uris).join(', ')} for changes\n`);

      toFiles(uris).forEach(file =>
        fs.watchFile(file, async () => {
          try {
            const update = await processFile(inputFile);
            fs.writeFileSync(outputFile, update.content);
            process.stdout.write(`Updated ${inputFile} -> ${outputFile} (trigger ${file})\n`);
          } catch (error) {
            if (error instanceof OapiValidationError) {
              process.stderr.write(`-----\n${error.toString()}`);
            } else {
              throw error;
            }
          }
        }),
      );
    }
  })
  .parse(process.argv);
