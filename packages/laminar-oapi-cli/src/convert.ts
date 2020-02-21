import { compile, Schema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { convertSchema } from './convert-schema';
import { OapiValidationError } from './OapiValidationError';

export const isOpenApiObject = (schema: Schema): schema is OpenAPIObject =>
  typeof schema === 'object' &&
  schema !== null &&
  'openapi' in schema &&
  'info' in schema &&
  'paths' in schema;

export const oapiTs = async (api: OpenAPIObject | string): Promise<string> => {
  const { schema, refs } = await compile(api);
  if (!isOpenApiObject(schema)) {
    throw new OapiValidationError('Invalid Schema', [
      'Schema could not be converted to typescript. Not a json-schema',
    ]);
  }

  const context = { root: schema, refs };

  return printDocument(convertOapi(context, schema));
};

export const schemaTs = async (api: Schema | string): Promise<string> => {
  const { schema, refs } = await compile(api);

  return printDocument(convertSchema({ root: schema as SchemaObject, refs }, schema));
};
