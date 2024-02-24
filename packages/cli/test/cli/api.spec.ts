import { compile } from '@laminarjs/json-schema';
import { readdirSync } from 'fs';
import { join } from 'path';
import { apiContent } from '../../src';

const oapiSchemas = readdirSync(join(__dirname, '../specs')).filter(
  (file) => file.endsWith('.yaml') || file.endsWith('.json'),
);

describe('Types Content', () => {
  it.each(oapiSchemas)('Test %s', async (file) => {
    const schema = await compile(join(__dirname, '../specs', file));
    expect(apiContent(schema)).toMatchSnapshot();
  });
});
