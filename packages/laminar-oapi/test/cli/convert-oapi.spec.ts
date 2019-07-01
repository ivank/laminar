import { loadYamlFile } from '@ovotech/laminar-oapi';
import { readdirSync } from 'fs';
import { OpenAPIObject } from 'openapi3-ts';
import { join } from 'path';
import { oapiTs } from '../../src';

const oapiSchemas = readdirSync(join(__dirname, '../specs'))
  .filter(file => file.endsWith('.yaml'))
  .map<[string, OpenAPIObject]>(file => [file, loadYamlFile(join(__dirname, '../specs', file))]);

describe('Json Schema Ts', () => {
  it.each(oapiSchemas)('Test %s', async (file, schema) => {
    const result = await oapiTs(schema);
    expect(result).toMatchSnapshot();
  });
});
