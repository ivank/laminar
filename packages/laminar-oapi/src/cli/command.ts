import { Schema, validate } from '@ovotech/json-schema';
import { Command } from 'commander';
import { readFileSync, watchFile, writeFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import * as OpenApiSchema from 'oas-schemas/schemas/v3.0/schema.json';
import { OpenAPIObject } from 'openapi3-ts';
import { oapiTs } from './convert';
import { OapiValidationError } from './OapiValidationError';

export const isYaml = (fileName: string) => fileName.endsWith('.yaml') || fileName.endsWith('.yml');

export const processFile = async (fileName: string) => {
  const file = readFileSync(fileName, 'utf8');
  const api: OpenAPIObject = isYaml(fileName) ? safeLoad(file) : JSON.parse(file);
  const check = await validate(OpenApiSchema as Schema, api);

  if (!check.valid) {
    throw new OapiValidationError('Invalid API Definition', check.errors);
  }

  return await oapiTs(api);
};

new Command()
  .description('Convert openapi schemas to typescript types')
  .option('-w, --watch', 'Watch for file changes and update live')
  .arguments('<input-file> <output-file>')
  .action(async (inputFile, outputFile, { watch }) => {
    try {
      writeFileSync(outputFile, await processFile(inputFile));
      process.stdout.write(`Conterted ${inputFile} -> ${outputFile}\n`);
    } catch (error) {
      if (error instanceof OapiValidationError) {
        process.stderr.write(`-----\n${error.toString()}`);
      } else {
        throw error;
      }
    }

    if (watch) {
      process.stdout.write(`Watching ${inputFile} for changes\n`);
      watchFile(inputFile, async stats => {
        try {
          writeFileSync(outputFile!, await processFile(inputFile));
          process.stdout.write(
            `Updated ${inputFile} -> ${outputFile} (${(stats.size / 1024).toFixed(2)}) KBs)\n`,
          );
        } catch (error) {
          if (error instanceof OapiValidationError) {
            process.stderr.write(`-----\n${error.toString()}`);
          } else {
            throw error;
          }
        }
      });
    }
  })
  .parse(process.argv);
