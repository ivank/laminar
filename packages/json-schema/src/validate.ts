import { validateSchema, hasErrors, Validator } from './validation';
import { formatErrors } from './messages';
import { Schema } from './schema';
import { ValidationError } from './ValidationError';
import { draft4 } from './drafts/draft4';
import { draft201909 } from './drafts/draft201909';
import { draft7 } from './drafts/draft7';
import { draft6 } from './drafts/draft6';
import { resolveFile, resolve, ResolvedSchema } from './resolve';

export interface Drafts {
  draft4: Validator[];
  draft6: Validator[];
  draft7: Validator[];
  'draft2019-09': Validator[];
}

export interface ValidateResult {
  schema: ResolvedSchema;
  name: string;
  errors: string[];
  valid: boolean;
}

export interface ValidateOptions {
  schema: Schema | ResolvedSchema | string;
  value: unknown;
  name?: string;
  draft?: keyof Drafts;
}

export interface ValidateCompiledOptions extends ValidateOptions {
  schema: ResolvedSchema;
}

const drafts: Drafts = {
  draft4,
  draft6,
  draft7,
  'draft2019-09': draft201909,
};

export const compile = async (schema: Schema | string): Promise<ResolvedSchema> =>
  typeof schema === 'string' ? resolveFile(schema) : resolve(schema);

export const isCompiled = (schema: Schema | ResolvedSchema | string): schema is ResolvedSchema =>
  typeof schema === 'object' && 'schema' in schema && 'refs' in schema && 'uris' in schema;

export const validateCompiled = ({
  schema,
  value,
  name = 'value',
  draft = 'draft2019-09',
}: ValidateCompiledOptions): ValidateResult => {
  const validators = drafts[draft];
  const validation = validateSchema(schema.schema, value, { validators, refs: schema.refs, name });
  return { schema, name, errors: formatErrors(validation), valid: !hasErrors(validation) };
};

export const validate = async ({ schema, ...rest }: ValidateOptions): Promise<ValidateResult> =>
  validateCompiled({ ...rest, schema: isCompiled(schema) ? schema : await compile(schema) });

export const ensureValid = async <T>(options: ValidateOptions): Promise<T> => {
  const result = await validate(options);

  if (!result.valid) {
    throw new ValidationError(`Invalid ${result.name}`, result.errors);
  }

  return options.value as T;
};
