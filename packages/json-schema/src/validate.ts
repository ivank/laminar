import { validateSchema, hasErrors, Validator, Validation, Invalid } from './validation';
import { messages, toMessages } from './messages';
import { Schema } from './schema';
import { ValidationError } from './ValidationError';
import { draft4 } from './drafts/draft4';
import { draft201909 } from './drafts/draft201909';
import { draft7 } from './drafts/draft7';
import { draft6 } from './drafts/draft6';
import { openapi3 } from './drafts/openapi3';
import { ResolvedSchema, isCompiled, compile } from './resolve';
import { errors } from '.';

export interface Drafts {
  draft4: Validator[];
  draft6: Validator[];
  draft7: Validator[];
  'draft2019-09': Validator[];
  openapi3: Validator[];
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
  errors: (string | Invalid)[];
  valid: false;
}

export type Result<T> = ResultSuccess<T> | ResultError;

export type FormatErrors = ((errors: Validation) => string[]) | boolean;

interface ValidateOptionsBase {
  value: unknown;
  name?: string;
  draft?: keyof Drafts;
  formatErrors?: FormatErrors;
}

export interface ValidateSchemaOptions extends ValidateOptionsBase {
  schema: Schema | string;
}

export interface ValidateCompiledOptions extends ValidateOptionsBase {
  schema: ResolvedSchema;
}

export type ValidateOptions = ValidateSchemaOptions | ValidateCompiledOptions;

export const drafts: Drafts = {
  draft4,
  draft6,
  draft7,
  'draft2019-09': draft201909,
  openapi3: openapi3,
};

export function validateCompiled<T>({
  schema,
  value,
  name = 'value',
  draft = 'draft2019-09',
  formatErrors = toMessages(messages),
}: ValidateCompiledOptions): Result<T> {
  const validators = drafts[draft];
  const validation = validateSchema(schema.schema, value, { validators, refs: schema.refs, name });
  const toErrors = formatErrors === true ? toMessages(messages) : formatErrors === false ? errors : formatErrors;

  return hasErrors(validation)
    ? { schema, value, name, errors: toErrors(validation), valid: false }
    : { schema, value: value as T, name, errors: [], valid: true };
}

export function validate<T>(options: ValidateSchemaOptions): Promise<Result<T>>;
export function validate<T>(options: ValidateCompiledOptions): Result<T>;
export function validate<T>({ schema, ...rest }: ValidateOptions): Promise<Result<T>> | Result<T> {
  return isCompiled(schema)
    ? validateCompiled({ ...rest, schema })
    : compile(schema).then((compiledSchema) => validateCompiled({ ...rest, schema: compiledSchema }));
}

export function ensureValidCompiled<T>(options: ValidateCompiledOptions): ResultSuccess<T> {
  const result = validateCompiled<T>(options);
  if (!result.valid) {
    throw new ValidationError(`Invalid ${result.name}`, result.errors);
  }
  return result;
}

export function ensureValid<T>(options: ValidateSchemaOptions): Promise<ResultSuccess<T>>;
export function ensureValid<T>(options: ValidateCompiledOptions): ResultSuccess<T>;
export function ensureValid<T>({ schema, ...rest }: ValidateOptions): Promise<ResultSuccess<T>> | ResultSuccess<T> {
  if (isCompiled(schema)) {
    return ensureValidCompiled<T>({ ...rest, schema });
  } else {
    return compile(schema).then((compiledSchema) => ensureValidCompiled<T>({ ...rest, schema: compiledSchema }));
  }
}
