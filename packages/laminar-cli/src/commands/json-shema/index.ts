import { compile, Schema } from '@ovotech/json-schema';
import * as commander from 'commander';
import * as fs from 'fs';
import * as YAML from 'yaml';
import { printDocument, Type, document } from '@ovotech/ts-compose';
import { green, yellow } from 'chalk';
import { dirname } from 'path';
import { Logger } from '../../types';
import { toString } from '../../helpers';
import { convertSchema } from '../../convert-schema';
import { SchemaObject } from 'openapi3-ts';

export const processFile = async (file: string, name: string): Promise<string> => {
  const { schema, refs } = await compile(file);
  const converted = convertSchema({ root: schema as SchemaObject, refs }, schema);
  return printDocument(document(converted.context, Type.Alias({ name, isExport: true, type: converted.type })));
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

export const jsonSchemaCommand = (logger: Logger = console): commander.Command =>
  commander
    .createCommand('json-schema')
    .description('Convert json schema to typescript types')
    .option('-t, --type <type>', 'name for the type', 'Type')
    .option('-f, --file <file>', 'Filename to process, uses STDIN if not specified')
    .option('-t, --stdin-type <type>', 'Type of STDIN data: "json" or "yaml"', 'json')
    .option('-o, --output <output>', 'File to output to, uses STDOUT if not specified')
    .action(async ({ file, type, output, stdinType }) => {
      const input = file ? file : parseSchema(stdinType, await toString(process.stdin));
      const result = await processFile(input, type);

      if (output) {
        fs.mkdirSync(dirname(output), { recursive: true });
        logger.info(`OpanAPI Schema ${green(file ? file : 'STDIN')} -> ${yellow(output)} axios types`);
        fs.writeFileSync(output, result);
      } else {
        process.stdout.write(result);
      }
    });
