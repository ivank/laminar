/**
 * chunk from lodash/fp
 * https://lodash.com/docs/4.17.15#chunk
 */
export const chunk = <T>(size: number, array: T[]): T[][] =>
  Array.from(Array(Math.ceil(array.length / size))).map((_, index) => array.slice(index * size, index * size + size));

/**
 * groupBy from lodash/fp, but generates a Map instead of an object.
 * This is so the ordering can be preserved
 * https://lodash.com/docs/4.17.15#groupBy
 */
export const groupByMap = <T>(predicate: (item: T) => string, items: T[]): Map<string, T[]> =>
  items.reduce((acc, item) => {
    const name = predicate(item);
    return acc.set(name, [...(acc.get(name) ?? []), item]);
  }, new Map());

/**
 * mapValues from lodash/fp
 * https://lodash.com/docs/4.17.15#groupBy
 */
export const mapValues = <TObject extends Record<string, unknown>>(
  predicate: <TValue = TObject[keyof TObject]>(value: TValue, name: string) => TValue,
  obj: TObject,
): TObject => Object.fromEntries(Object.entries(obj).map(([name, value]) => [name, predicate(value, name)])) as TObject;
