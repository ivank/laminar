import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveRefs } from '../../src/helpers/json-refs';

const openApi3 = JSON.parse(String(readFileSync(join(__dirname, 'openapi.v3.json'))));

describe('json-refs', () => {
  it('simple', async () => {
    const test1 = {
      test: '123',
      other: {
        $ref: '#/test',
      },
    };
    expect(resolveRefs(test1)).toMatchSnapshot();
  });

  it('openapi', async () => {
    expect(resolveRefs(openApi3)).toMatchSnapshot();
  });
});
