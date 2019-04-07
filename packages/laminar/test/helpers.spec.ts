// import { parse } from 'querystring';
import { deepQueryObjects } from '../src/helpers';

describe('Helpers', () => {
  it('deepQueryObjects', async () => {
    const result = deepQueryObjects({ 'test[a][b]': 123 });
    // console.log(result);
    expect(result).toEqual({ test: { a: { b: 123 } } });
  });
});
