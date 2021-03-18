import * as commander from 'commander';
import { apiCommand } from './api';
import { axiosCommand } from './axios';
import { jsonSchemaCommand } from './json-shema';
import { convertCommand } from './avro';
import { Logger } from '../types';

export const laminarCommand = (output: Logger = console): commander.Command =>
  commander
    .createCommand('laminar')
    .version('0.11.0')
    .description(
      `Laminar CLI - a tool for converting OpenApi and Avro Schemas to appropriate typescript types

laminar api
  Convert openapi schema to types used by laminar api (openApiTyped middleware)

laminar axios
  Convert openapi schema to types used by axios

laminar json-schema
  Convert json schema to typescript types

laminar avro
  Convert avro to typescript types

Example:
  laminar api --file openapi.yaml --output src/__generated__/openapi.yaml.ts
  curl http://example.com/openapi.yaml | laminar api --stdin-type yaml | prettier --stdin-filepath openapi.yamlts > src/__generated__/openapi.yaml.ts
  laminar api --file openapi.yaml --output src/__generated__/openapi.yaml.ts --watch
  laminar avro path/to/*.avsc --output-dir src/__generated__ --logical-type timestamp-millis=Date
`,
    )
    .addCommand(apiCommand(output))
    .addCommand(axiosCommand(output))
    .addCommand(jsonSchemaCommand(output))
    .addCommand(convertCommand(output));
