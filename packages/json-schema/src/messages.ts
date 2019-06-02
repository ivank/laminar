import { Invalid, Messages, Result } from './types';

export const messages: Messages = {
  not: ({ name }) => `[${name}] should not match`,
  enum: ({ name, param }) => `[${name}] should be one of [${param.join(', ')}]`,
  type: ({ name, param }) => `[${name}] should be a [${param}]`,
  multipleOf: ({ name, param }) => `[${name}] should be a multiple of ${param}`,
  minimum: ({ name, param }) => `[${name}] should be >= ${param}`,
  exclusiveMinimum: ({ name, param }) => `[${name}] should be > ${param}`,
  maximum: ({ name, param }) => `[${name}] should be <= ${param}`,
  exclusiveMaximum: ({ name, param }) => `[${name}] should be < ${param}`,
  pattern: ({ name, param }) => `[${name}] should match /${param}/`,
  format: ({ name, param }) => `[${name}] should match ${param} format`,
  maxLength: ({ name, param }) => `[${name}] should have length <= ${param}`,
  minLength: ({ name, param }) => `[${name}] should have length >= ${param}`,
  false: ({ name }) => `[${name}] should not exist`,
  additionalProperties: ({ name, param }) => `[${name}] has unknown keys [${param.join(', ')}]`,
  required: ({ name, param }) => `[${name}] is missing [${param.join(', ')}] keys`,
  minProperties: ({ name, param }) => `[${name}] should have >= ${param} keys`,
  maxProperties: ({ name, param }) => `[${name}] should have <= ${param} keys`,
  dependencies: ({ name, param }) => `[${name}] requires [${param.join(', ')}] keys`,
  uniqueItems: ({ name, param }) =>
    `[${name}] should have only unique values, has ${param} duplicates`,
  minItems: ({ name, param }) => `[${name}] should have >= ${param} items`,
  maxItems: ({ name, param }) => `[${name}] should have <= ${param} items`,
  oneOf: ({ name, param }: Invalid<{ matching: number; errors: Result[] }>) =>
    `[${name}] should match only 1 schema, matching ${param.matching}`,
  anyOf: ({ name }) => `[${name}] should match at least 1 schema`,
};
