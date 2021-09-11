import { Options } from './validation';
import { JsonSchema, Schema } from './schema';
import { coerceAllOf } from './coercers/coerceAllOf';
import { coerceItems } from './coercers/coerceItems';
import { coerceRef } from './coercers/coerceRef';
import { coerceType } from './coercers/coerceType';
import { coerceProperties } from './coercers/coerceProperties';
import { coerceSearchQueryType } from './coercers/coerceSearchQueryType';
import { coerceOneOf } from './coercers/coerceOneOf';
import { coerceAnyOf } from './coercers/coerceAnyOf';
import { coerceDefault } from './coercers/coerceDefault';

export interface CoercerOptions extends Options {
  coercers: Coercer[];
}

export type Coercer<TSchema = JsonSchema, TValue = unknown> = (
  schema: TSchema,
  value: TValue,
  options: CoercerOptions,
) => TValue;

export const coerceSchema: Coercer<Schema> = (schema, value, options) =>
  typeof schema === 'boolean'
    ? value
    : options.coercers.reduce((current, coercer) => coercer(schema, current, options), value);

export const coercers = {
  json: [coerceRef, coerceDefault, coerceProperties, coerceItems, coerceType, coerceOneOf, coerceAllOf, coerceAnyOf],
  query: [
    coerceRef,
    coerceDefault,
    coerceProperties,
    coerceItems,
    coerceSearchQueryType,
    coerceOneOf,
    coerceAllOf,
    coerceAnyOf,
  ],
};
