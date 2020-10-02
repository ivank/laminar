import { ResolvedSchema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { convertOapi as apiConvert } from './commands/api/convert';
import { convertOapi as axiosConvert } from './commands/axios/convert';
import { convertSchema } from './convert-schema';

export { convertSchema } from './convert-schema';

export const apiContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(apiConvert({ root: schema as OpenAPIObject, refs }, schema as OpenAPIObject));

export const axiosContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(axiosConvert({ root: schema as OpenAPIObject, refs }, schema as OpenAPIObject));

export const schemaContent = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(convertSchema({ root: schema as SchemaObject, refs }, schema));
