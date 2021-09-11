import { coercers, coerceSchema } from './coercion';
import { compile, isCompiled, ResolvedSchema } from './resolve';
import { Schema } from './schema';
import { drafts, Drafts } from './validate';

interface CoerceOptionsBase {
  value: unknown;
  name?: string;
  draft?: keyof Drafts;
  type?: keyof typeof coercers;
}

export interface CoerceSchemaOptions extends CoerceOptionsBase {
  schema: Schema | string;
}

export interface CoerceCompiledOptions extends CoerceOptionsBase {
  schema: ResolvedSchema;
}

export type CoerceOptions = CoerceSchemaOptions | CoerceCompiledOptions;

export function coerceCompiled({
  schema,
  value,
  name = 'value',
  draft = 'draft2019-09',
  type = 'json',
}: CoerceCompiledOptions): unknown {
  const validators = drafts[draft];
  return coerceSchema(schema.schema, value, { validators, refs: schema.refs, name, coercers: coercers[type] });
}

/**
 * Coerce a given value, using the provided json schema.
 *
 *  - With type: 'json'
 *    This is used to convert json validated with json schema into javascript objects.
 *    Namely it converts all the strings with format date and date-time into Date objects
 *  - With type: 'query'
 *    To convert a value coming from a URL query string to the type you want it to be,
 *    for example '12' with type: 'integer' will be converted to 12 so the validation can succeed.
 *
 * Additionally, we assign default values where appropriate.
 */
export function coerce(options: CoerceCompiledOptions): unknown;
export function coerce(options: CoerceSchemaOptions): Promise<unknown>;
export function coerce({ schema, ...rest }: CoerceOptions): unknown {
  return isCompiled(schema)
    ? coerceCompiled({ ...rest, schema })
    : compile(schema).then((compiledSchema) => coerceCompiled({ ...rest, schema: compiledSchema }));
}
