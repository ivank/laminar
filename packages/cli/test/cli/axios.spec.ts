import { compile } from '@laminarjs/json-schema';
import { readdirSync } from 'fs';
import { join } from 'path';
import { axiosContent } from '../../src';

const oapiSchemas = readdirSync(join(__dirname, '../specs')).filter((file) => file.endsWith('.yaml'));

describe('Axios Content', () => {
  it.each(oapiSchemas)('Test %s', async (file) => {
    const schema = await compile(join(__dirname, '../specs', file));
    expect(axiosContent(schema)).toMatchSnapshot();
  });
});
