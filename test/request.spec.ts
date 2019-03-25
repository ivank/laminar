import { parseContentType } from '../src/request';

describe('Test', () => {
  it('Should push', () => {
    const result = parseContentType('application/json');
    console.log(result);
  });
});
