import { resolveRefs } from '@ovotech/json-refs';
import { printDocument } from '@ovotech/ts-compose';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { convertOapi } from './convert-oapi';
import { convertSchema } from './convert-schema';

export const oapiTs = async (original: OpenAPIObject) => {
  const { schema, refs } = await resolveRefs(original);
  const context = { root: schema, refs, identifiers: {}, imports: {} };

  return printDocument(convertOapi(context, schema));
};

export const schemaTs = async (api: SchemaObject) => {
  const { schema, refs } = await resolveRefs(api);
  return printDocument(convertSchema({ root: schema, refs, identifiers: {}, imports: {} }, schema));
};
