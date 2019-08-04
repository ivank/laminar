import { RefMap, JsonSchema, ResolvedSchema, Schema } from '@ovotech/json-refs';

export interface Discriminator {
  propertyName: string;
}

export interface Invalid<TParam = unknown> {
  code: keyof Messages;
  name: string;
  param: TParam;
}

export interface ValidateOptions {
  name: string;
  validators: Validator[];
  refs: RefMap;
}

export interface OapiJsonSchema extends JsonSchema {
  not?: Schema;
  discriminator?: {
    propertyName?: string;
  };
}

export type Validator<TSchema = OapiJsonSchema, TValue = unknown> = (
  schema: TSchema,
  value: TValue,
  options: ValidateOptions,
) => Invalid[];

export interface Messages {
  [key: string]: (error: Invalid) => string;
}

export interface ValidationResult {
  schema: ResolvedSchema;
  errors: string[];
  valid: boolean;
}
