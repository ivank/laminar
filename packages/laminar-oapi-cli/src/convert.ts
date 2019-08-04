import { compile, Schema } from '@ovotech/json-schema';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { convertSchema } from './convert-schema';

export const oapiTs = async (api: OpenAPIObject | string): Promise<string> => {
  const { schema, refs } = await compile(api);
  const context = { root: schema, refs, identifiers: {}, imports: {} };

  return printDocument(convertOapi(context, schema));
};

export const schemaTs = async (api: Schema | string): Promise<string> => {
  const { schema, refs } = await compile(api);
  return printDocument(convertSchema({ root: schema, refs, identifiers: {}, imports: {} }, schema));
};
