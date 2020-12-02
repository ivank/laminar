import { validateSchema, hasErrors, Validator, Validation } from './validation';
import { messages, toMessages } from './messages';
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

export interface ResultSuccess<T> {
  schema: ResolvedSchema;
  name: string;
  value: T;
  errors: string[];
  valid: true;
}

export interface ResultError {
  schema: ResolvedSchema;
  value: unknown;
  name: string;
  errors: string[];
  valid: false;
}

export type Result<T> = ResultSuccess<T> | ResultError;

export interface ValidateOptions {
  schema: Schema | ResolvedSchema | string;
  value: unknown;
  name?: string;
  draft?: keyof Drafts;
  formatErrors?: (errors: Validation) => string[];
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

export const toSchemaObject = <T extends Schema = Schema>(schema: ResolvedSchema<T>): T => schema.schema;

export const compileInContext = <T extends Schema = Schema>(
  schema: T,
  { schema: compiledSchema, ...context }: ResolvedSchema,
): ResolvedSchema<T> => ({ schema, ...context });

export const isCompiled = (schema: Schema | ResolvedSchema | string): schema is ResolvedSchema =>
  typeof schema === 'object' && 'schema' in schema && 'refs' in schema && 'uris' in schema;

export const validateCompiled = <T>({
  schema,
  value,
  name = 'value',
  draft = 'draft2019-09',
  formatErrors = toMessages(messages),
}: ValidateCompiledOptions): Result<T> => {
  const validators = drafts[draft];
  const validation = validateSchema(schema.schema, value, { validators, refs: schema.refs, name });
  return hasErrors(validation)
    ? { schema, value, name, errors: formatErrors(validation), valid: false }
    : { schema, value: value as T, name, errors: [], valid: true };
};

export const validate = async <T>({ schema, ...rest }: ValidateOptions): Promise<Result<T>> =>
  validateCompiled({ ...rest, schema: isCompiled(schema) ? schema : await compile(schema) });

export const ensureValid = async <T>(options: ValidateOptions): Promise<ResultSuccess<T>> => {
  const result = await validate<T>(options);

  if (!result.valid) {
    throw new ValidationError(`Invalid ${result.name}`, result.errors);
  }

  return result;
};
