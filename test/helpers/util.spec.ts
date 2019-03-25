import { push } from '../../src/helpers/util';

describe('Test', () => {
  it('Should push', () => {
    const a = push(['test', 'test2'], '1', {});
    const b = push(['test', 'test2'], '2', a);
    const c = push(['test', 'test3'], '2', b);
    console.log(c);
  });
});
