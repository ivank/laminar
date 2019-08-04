import { Messages } from './types';

export const messages: Messages = {
  not: ({ name }) => `[${name}] should not match`,
  enum: ({ name, param }) =>
    `[${name}] should be one of [${Array.isArray(param) ? param.join(', ') : param}]`,
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
  additionalProperties: ({ name, param }) =>
    `[${name}] has unknown keys [${Array.isArray(param) ? param.join(', ') : param}]`,
  required: ({ name, param }) =>
    `[${name}] is missing [${Array.isArray(param) ? param.join(', ') : param}] keys`,
  minProperties: ({ name, param }) => `[${name}] should have >= ${param} keys`,
  maxProperties: ({ name, param }) => `[${name}] should have <= ${param} keys`,
  dependencies: ({ name, param }) =>
    `[${name}] requires [${Array.isArray(param) ? param.join(', ') : param}] keys`,
  uniqueItems: ({ name, param }) =>
    `[${name}] should have only unique values, has ${param} duplicates`,
  minItems: ({ name, param }) => `[${name}] should have >= ${param} items`,
  maxItems: ({ name, param }) => `[${name}] should have <= ${param} items`,
  oneOf: ({ name, param }) => `[${name}] should match only 1 schema, matching ${param}`,
  anyOf: ({ name }) => `[${name}] should match at least 1 schema`,
};
