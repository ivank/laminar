import { Messages, errors, Validation, Invalid } from './validation';

const toArray = (param: unknown): string =>
  Array.isArray(param) ? `[${param.map((item) => item).join(', ')}]` : `${param}`;

const padWith = (padStr: string, str: string): string => str.replace(/^/gm, padStr);

const formatErrors = (parentName: string, errors: Invalid[]): string =>
  errors.length
    ? errors
        .map((error) => ({
          ...error,
          name: error.code === 'oneOf' ? error.name : error.name.slice(parentName.length),
        }))
        .map(toMessage(messages))
        .join('\n')
    : 'no errors';

const formatVariants = (parentName: string, variants: Invalid[][]): string =>
  variants
    .map(
      (errors, index) => `Schema ${index + 1}:\n${padWith('  ', formatErrors(parentName, errors))}`,
    )
    .join('\n');

const formatErrorGroups = (parentName: string, variants: Invalid[][]): string =>
  padWith('  | ', formatVariants(parentName, variants));

export const messages: Messages = {
  not: ({ name }) => `[${name}] (not) should not match`,
  enum: ({ name, param }) => `[${name}] (enum) should be one of ${toArray(param)}`,
  type: ({ name, param }) => `[${name}] (type) should be of type ${param}`,
  multipleOf: ({ name, param }) => `[${name}] (multipleOf) should be a multiple of ${param}`,
  minimum: ({ name, param }) => `[${name}] (minimum) should be >= ${param}`,
  exclusiveMinimum: ({ name, param }) => `[${name}] (exclusiveMinimum) should be > ${param}`,
  maximum: ({ name, param }) => `[${name}] (maximum) should be <= ${param}`,
  exclusiveMaximum: ({ name, param }) => `[${name}] (exclusiveMaximum) should be < ${param}`,
  pattern: ({ name, param }) => `[${name}] (pattern) should match /${param}/`,
  format: ({ name, param }) => `[${name}] (format) should match ${param} format`,
  maxLength: ({ name, param }) => `[${name}] (maxLength) should have length <= ${param}`,
  minLength: ({ name, param }) => `[${name}] (minLength) should have length >= ${param}`,
  contains: ({ name }) => `[${name}] (contains) should contain items`,
  false: ({ name }) => `[${name}] (false) should not exist`,
  additionalProperties: ({ name, param }) =>
    `[${name}] (additionalProperties) has unknown key ${param}`,
  unevaluatedProperties: ({ name, param }) =>
    `[${name}] (unevaluatedProperties) has unevaluated keys ${toArray(param)}`,
  unevaluatedItems: ({ name, param }) =>
    `[${name}] (unevaluatedItems) has unevaluated item ${param}]`,
  required: ({ name, param }) => `[${name}] (required) is missing ${toArray(param)} keys`,
  minProperties: ({ name, param }) => `[${name}] (minProperties) should have >= ${param} keys`,
  maxProperties: ({ name, param }) => `[${name}] (maxProperties) should have <= ${param} keys`,
  dependencies: ({ name, param }) => `[${name}] (dependencies) requires [${toArray(param)}] keys`,
  uniqueItems: ({ name, param }) =>
    `[${name}] (uniqueItems) should have only unique values, has ${param} duplicates`,
  minItems: ({ name, param }) => `[${name}] (minItems) should have >= ${param} items`,
  maxItems: ({ name, param }) => `[${name}] (maxItems) should have <= ${param} items`,
  oneOf: ({ name, param }) =>
    Array.isArray(param)
      ? `[${name}] (oneOf) should satisfy exactly only 1 schema\n${formatErrorGroups(name, param)}`
      : `[${name}] (oneOf) should match only 1 schema`,
  anyOf: ({ name, param }) =>
    Array.isArray(param)
      ? `[${name}] (anyOf) should match at least 1 schema\n${formatErrorGroups(name, param)}`
      : `[${name}] (anyOf) should match at least 1 schema`,
};

export const toMessage = (messages: Messages) => (error: Invalid): string =>
  messages[error.code](error);
export const toMessages = (messages: Messages) => (validation: Validation): string[] =>
  errors(validation).map(toMessage(messages));
