import { Schema, validate } from '@ovotech/json-schema';
import { readFileSync, watchFile, writeFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import * as OpenApiSchema from 'oas-schemas/schemas/v3.0/schema.json';
import { OpenAPIObject } from 'openapi3-ts';
import * as yargs from 'yargs';
import { oapiTs } from './convert';
import { OapiValidationError } from './OapiValidationError';

interface ConvertOapiTags {
  outputFile: string;
  inputFile: string;
  watch?: boolean;
  w?: boolean;
}

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

export const convertOapiCommand: yargs.CommandModule<{}, ConvertOapiTags> = {
  command: 'convert <input-file> <output-file>',
  builder: {
    watch: {
      alias: 'w',
      description: 'Watch for file changes and update live',
      type: 'boolean',
      default: false,
    },
  },
  describe: 'Convert avsc to typescript files',
  handler: async ({ inputFile, outputFile, watch }) => {
    writeFileSync(outputFile, await processFile(inputFile));
    process.stdout.write(`Conterted ${inputFile} -> ${outputFile}\n`);

    if (watch) {
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
  },
};

export const argv = yargs
  .command(convertOapiCommand)
  .epilog('copyright OVO Energy 2019')
  .demandCommand()
  .fail((msg, err) => {
    if (err instanceof OapiValidationError) {
      process.stderr.write(err.toString());
    } else {
      process.stderr.write(`Error: ${msg || err.message}\n`);
    }
    process.exit(1);
  })
  .help().argv;
