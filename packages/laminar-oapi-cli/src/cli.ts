import { readFileSync } from 'fs';
import { createWriteStream } from 'fs';
import { safeLoad } from 'js-yaml';
import { OpenAPIObject } from 'openapi3-ts';
import * as yargs from 'yargs';
import { CommandModule } from 'yargs';
import { oapiTs } from './convert';

interface ConvertOapiTags {
  'context-extends'?: string;
  'output-file'?: string;
  o?: string;
  file: string;
}

export const convertOapiCommand: CommandModule<{}, ConvertOapiTags> = {
  command: 'convert <file>',
  builder: {
    ['context-extends']: {
      description: 'The interface the context extends',
      default: 'Context',
    },
    ['output-file']: {
      alias: 'o',
      description: 'The interface the context extends',
    },
  },
  describe: 'Convert avsc to typescript files',
  handler: async args => {
    const apiFile = String(readFileSync(args.file));
    const api: OpenAPIObject =
      args.file.endsWith('.yaml') || args.file.endsWith('.yml')
        ? safeLoad(apiFile)
        : JSON.parse(apiFile);

    const output = args['output-file']
      ? createWriteStream(args['output-file'], { flags: 'w' })
      : process.stdout;

    const tsContent = await oapiTs(api);

    output.write(tsContent);
  },
};

export const argv = yargs
  .command(convertOapiCommand)
  .epilog('copyright OVO Energy 2019')
  .demandCommand()
  .fail((msg, err) => {
    process.stderr.write(`Error: ${msg || err.message}\n`);
    process.exit(1);
  })
  .help().argv;
