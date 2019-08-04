import { readdirSync } from 'fs';
import { join } from 'path';
import { oapiTs } from '../../src';

const oapiSchemas = readdirSync(join(__dirname, '../specs')).filter(file => file.endsWith('.yaml'));

describe('Json Schema Ts', () => {
  it.each(oapiSchemas)('Test %s', async file => {
    const result = await oapiTs(join(__dirname, '../specs', file));
    expect(result).toMatchSnapshot();
  });
});
