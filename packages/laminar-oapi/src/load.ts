import { readFileSync } from 'fs';
import * as YAML from 'js-yaml';
import { OpenAPIObject } from 'openapi3-ts';

export const loadYamlFile = (file: string) => loadYaml(String(readFileSync(file)));
export const loadYaml = (yaml: string): OpenAPIObject => YAML.load(yaml);
export const loadJsonFile = (file: string): OpenAPIObject => loadJson(String(readFileSync(file)));
export const loadJson = (json: string): OpenAPIObject => JSON.parse(json);
