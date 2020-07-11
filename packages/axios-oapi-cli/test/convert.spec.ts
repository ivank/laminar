import { join } from 'path';
import { readdirSync } from 'fs';
import { compile } from '@ovotech/json-schema';
import { oapiTs } from '../src';

const schemasDir = join(__dirname, 'schemas');

const schemas = readdirSync(schemasDir).filter(
  (file) => file.endsWith('.json') || file.endsWith('.yaml'),
);

describe('Integration', () => {
  it.each<string>(schemas)('Should generate a correct schema for %s', async (filename) => {
    const schema = await compile(join(schemasDir, filename));
    expect(oapiTs(schema)).toMatchSnapshot();
  });
});
