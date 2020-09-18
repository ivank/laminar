import { ResolvedSchema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { convertSchema } from './convert-schema';

export const oapiTs = ({ schema, refs }: ResolvedSchema): string => {
  return printDocument(
    convertOapi({ root: schema as OpenAPIObject, refs }, schema as OpenAPIObject),
  );
};

export const schemaTs = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(convertSchema({ root: schema as SchemaObject, refs }, schema));
