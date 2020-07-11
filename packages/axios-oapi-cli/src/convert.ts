import { Schema, ResolvedSchema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { convertSchema } from './convert-schema';

export const isOpenApiObject = (schema: Schema): schema is OpenAPIObject =>
  typeof schema === 'object' &&
  schema !== null &&
  'openapi' in schema &&
  'info' in schema &&
  'paths' in schema;

export const oapiTs = ({ schema, refs }: ResolvedSchema): string => {
  if (!isOpenApiObject(schema)) {
    throw new Error(
      'Invalid Schema: Schema could not be converted to typescript. Not a json-schema',
    );
  }

  const context = { root: schema, refs };

  return printDocument(convertOapi(context, schema));
};

export const schemaTs = ({ schema, refs }: ResolvedSchema): string =>
  printDocument(convertSchema({ root: schema as SchemaObject, refs }, schema));
