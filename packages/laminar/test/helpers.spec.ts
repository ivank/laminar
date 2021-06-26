import { URLSearchParams } from 'url';
import { parseQueryObjects } from '../src';

describe('queryParserMiddleware', () => {
  it.each`
    query                                          | expected
    ${'param=test'}                                | ${{ param: 'test' }}
    ${'param=test,other,next'}                     | ${{ param: ['test', 'other', 'next'] }}
    ${'param=test&other=test'}                     | ${{ param: 'test', other: 'test' }}
    ${'this[one][two]=other&arr[]=111'}            | ${{ this: { one: { two: 'other' } }, arr: ['111'] }}
    ${'arr=test&arr=other&arr=next'}               | ${{ arr: ['test', 'other', 'next'] }}
    ${'arr[]=test&arr[]=other'}                    | ${{ arr: ['test', 'other'] }}
    ${'arr[0]=test&arr[1]=other'}                  | ${{ arr: ['test', 'other'] }}
    ${'params[ids][0]=1&params[ids][1]=2'}         | ${{ params: { ids: ['1', '2'] } }}
    ${'this[one][two][]=one&this[one][two][]=two'} | ${{ this: { one: { two: ['one', 'two'] } } }}
  `('Should parse $query', ({ query, expected }) => {
    expect(parseQueryObjects(new URLSearchParams(query))).toEqual(expected);
  });
});
