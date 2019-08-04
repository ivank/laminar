import { isEqual } from '../src/helpers';

describe('Helper isEqual', () => {
  it.each<[string, unknown, unknown, boolean]>([
    ['strings', 'test', 'other', false],
    ['strings', 'test', 'test', true],
    ['numbers', 1, 2, false],
    ['numbers', 1, 1, true],
    ['dates', new Date('2018-01-01'), new Date('2018-01-01'), true],
    ['numbers', 1, 1.2, false],
    ['empty arrays', [], [], true],
    ['arrays', ['one'], ['two'], false],
    ['arrays', ['one', 2, 'three'], ['one', 2, 'three'], true],
    ['arrays', ['one', 2, 'three'], ['one', 2, 'three', 'four'], false],
    ['object', { one: 1, two: 2, three: 3 }, { three: 3, two: 2, one: 1 }, true],
    ['object with number', 6, { foo: false }, false],
    ['object with string', 'foo', { foo: false }, false],
    ['object with array', [], { foo: false }, false],
    ['object with bool', true, { foo: false }, false],
    ['object', { foo: 12 }, { foo: false }, false],
    [
      'object deep invalid',
      { foo: 12, other: { test: [1, 2, { big: 'test' }] } },
      { foo: 12, other: { test: [1, 2, { big: 'other' }] } },
      false,
    ],
    [
      'object deep valid',
      { foo: 12, other: { test: [1, 2, { big: 'test' }] } },
      { foo: 12, other: { test: [1, 2, { big: 'test' }] } },
      true,
    ],
  ])('Should compare %s', (_, a, b, expected) => {
    expect(isEqual(a, b)).toBe(expected);
  });
});
