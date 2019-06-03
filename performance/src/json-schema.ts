import * as Benchmark from 'benchmark';
import { readdirSync, readFileSync } from 'fs';
import nock = require('nock');
import { join } from 'path';
import { adapter as ajv } from './adapters/ajv';
import { adapter as jsonSchema } from './adapters/json-schema';

export interface Adapter<TValidator = any> {
  name: string;
  compile: (schema: any) => Promise<TValidator>;
  validate: (compiled: TValidator, data: any, schema: any) => boolean;
}

interface Test {
  description: string;
  data: any;
  valid: boolean;
}

interface Suite {
  description: string;
  schema: any;
  tests: Test[];
}

const testSuiteFolder = join(__dirname, '../../external/JSON-Schema-Test-Suite');
const draftsFolder = join(__dirname, '../../external/json-schema-drafts');

nock('http://localhost:1234')
  .persist()
  .get('/integer.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/integer.json'))
  .get('/subSchemas.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/subSchemas.json'))
  .get('/folder/folderInteger.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/folder/folderInteger.json'))
  .get('/name.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/name.json'));

nock('http://json-schema.org')
  .persist()
  .get('/draft-04/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-4-schema.json'))
  .get('/draft-06/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-6-schema.json'))
  .get('/draft-07/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-7-schema.json'));

const adapters = [jsonSchema, ajv];
const testFolders = ['draft7'];

const benchmarkSuite = new Benchmark.Suite();

benchmarkSuite.on('cycle', (event: any) => {
  console.log(String(event.target));
});

for (const adapter of adapters) {
  benchmarkSuite.add(adapter.name, {
    defer: true,
    fn: async (deffered: any) => {
      for (const testFolder of testFolders) {
        const testFiles = readdirSync(join(testSuiteFolder, 'tests', testFolder))
          .filter(file => file.endsWith('.json'))
          .map<Suite[]>(file =>
            JSON.parse(String(readFileSync(join(testSuiteFolder, 'tests', testFolder, file)))),
          );

        for (const suites of testFiles) {
          for (const suite of suites) {
            const validator = await adapter.compile(suite.schema);
            for (const test of suite.tests) {
              const result = adapter.validate(validator, test.data, suite.schema);
              if (result !== test.valid) {
                throw new Error(
                  `Invalid test ${testFolder} ${suite.description} ${test.description}`,
                );
              }
            }
          }
        }
      }
      deffered.resolve();
    },
  });
}

benchmarkSuite.run({ async: true, minSamples: 1 });
