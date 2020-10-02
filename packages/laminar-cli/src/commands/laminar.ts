import * as commander from 'commander';
import { apiCommand } from './api';
import { axiosCommand } from './axios';
import { jsonSchemaCommand } from './json-shema';
import { Logger } from '../types';

export const laminarCommand = (output: Logger = console): commander.Command =>
  commander
    .createCommand('laminar')
    .version('0.9.0')
    .description(
      `Laminar CLI - a tool for converting OpenApi Schemas to appropriate typescript types

laminar api
  Convert openapi schema to types used by laminar api (openApiTyped middleware)

lamianr axios
  Convert openapi schema to types used by axios

lamianr json-schema
  Convert json schema to types

Example:
  laminar api --file openapi.yaml --output src/__generated__/openapi.yaml.ts
  curl http://example.com/openapi.yaml | laminar api --stdin-type yaml | prettier --stdin-filepath openapi.yamlts > src/__generated__/openapi.yaml.ts
  laminar api --file openapi.yaml --output src/__generated__/openapi.yaml.ts --watch
`,
    )
    .addCommand(apiCommand(output))
    .addCommand(axiosCommand(output))
    .addCommand(jsonSchemaCommand(output));
