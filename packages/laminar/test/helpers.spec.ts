import { parse } from 'querystring';
import { parseQueryObjects } from '../src/helpers';

describe('Helpers', () => {
  it.each<[string, Record<string, unknown>]>([
    ['test=123', { test: '123' }],
    ['test=111,222', { test: ['111', '222'] }],
    ['test[]=111', { test: ['111'] }],
    ['test[][a]=111', { test: [{ a: '111' }] }],
    ['test[][a]=111&test[][a]=222', { test: [{ a: ['111', '222'] }] }],
    ['test[a][]=111&test[a][]=222', { test: { a: ['111', '222'] } }],
    ['test[]=111&test[]=222', { test: ['111', '222'] }],
    ['test[a]=111&test[a]=222', { test: { a: ['111', '222'] } }],
    ['test[a]=111,222', { test: { a: ['111', '222'] } }],
    ['test[a][b][c]=111&test[a][b][d]=222', { test: { a: { b: { c: '111', d: '222' } } } }],
  ])('Should parse %s', (queryString, expected) => {
    const result = parseQueryObjects(parse(queryString));
    expect(result).toEqual(expected);
  });
});
