import { Type } from './__generated__/pullrequest';
import { ensureValid } from '@laminarjs/json-schema';
import { join } from 'path';

describe('Json Schema', () => {
  it('Should use types from convertion function', async () => {
    const value = { id: 123, title: 'other' };

    const result = await ensureValid<Type>({ schema: join(__dirname, 'pullrequest.yaml'), value });

    expect(result.valid).toBe(true);
  });
});
