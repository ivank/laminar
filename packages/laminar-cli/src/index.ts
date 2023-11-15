import { ResolvedSchema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { oas31 } from 'openapi3-ts';
import { convertOapi as apiConvert } from './commands/api/convert';
import { convertOapi as axiosConvert } from './commands/axios/convert';
import { convertSchema } from './convert-schema';

export { convertSchema } from './convert-schema';

export const apiContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(
    apiConvert(
      { root: schema as oas31.OpenAPIObject & { [index: string]: unknown }, refs },
      schema as oas31.OpenAPIObject & { [index: string]: unknown },
    ),
  );

export const axiosContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(
    axiosConvert(
      { root: schema as oas31.OpenAPIObject & { [index: string]: unknown }, refs },
      schema as oas31.OpenAPIObject & { [index: string]: unknown },
    ),
  );

export const schemaContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(convertSchema({ root: schema as oas31.SchemaObject, refs }, schema));

export { toTypeScript as avroConvert } from './commands/avro/convert';
export { toTypeScript as fixturesConvert } from './commands/fixtures/convert';
export { toExternalContext as avroExternalConvert } from './commands/avro/convert';
