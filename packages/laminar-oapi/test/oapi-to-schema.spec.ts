import { resolveRefs } from '@ovotech/json-refs';
import { readdirSync, readFileSync } from 'fs';
import { OpenAPIObject } from 'openapi3-ts';
import { join } from 'path';
import { loadJson, loadJsonFile, loadYaml, loadYamlFile, toSchema } from '../src';

const yamlSchemas = readdirSync(join(__dirname, 'specs'))
  .filter(file => file.endsWith('.yaml'))
  .map<[string, OpenAPIObject, OpenAPIObject]>(file => [
    file,
    loadYaml(String(readFileSync(join(__dirname, 'specs', file)))),
    loadYamlFile(join(__dirname, 'specs', file)),
  ]);

const jsonSchemas = readdirSync(join(__dirname, 'specs'))
  .filter(file => file.endsWith('.json'))
  .map<[string, OpenAPIObject, OpenAPIObject]>(file => [
    file,
    loadJson(String(readFileSync(join(__dirname, 'specs', file)))),
    loadJsonFile(join(__dirname, 'specs', file)),
  ]);

describe('Loading and processing yaml schemas', () => {
  it.each(yamlSchemas)('Test %s', async (file, schema1, schema2) => {
    const resolved1 = await resolveRefs(schema1);
    const resolved2 = await resolveRefs(schema2);

    const result1 = toSchema(resolved1.schema);
    const result2 = toSchema(resolved2.schema);

    expect(schema1).toEqual(schema2);
    expect(result1).toMatchSnapshot();
    expect(result2).toMatchSnapshot();
  });
});

describe('Loading and processing json schemas', () => {
  it.each(jsonSchemas)('Test %s', async (file, schema1, schema2) => {
    const resolved1 = await resolveRefs(schema1);
    const resolved2 = await resolveRefs(schema2);

    const result1 = toSchema(resolved1.schema);
    const result2 = toSchema(resolved2.schema);

    expect(schema1).toEqual(schema2);
    expect(result1).toMatchSnapshot();
    expect(result2).toMatchSnapshot();
  });
});
