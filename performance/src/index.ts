import * as Benchmark from 'benchmark';
import { readdirSync, readFileSync } from 'fs';
import * as nock from 'nock';
import { join } from 'path';
import { adapter as ajv } from './adapters/ajv';
import { adapter as jsonSchema } from './adapters/json-schema';
import { Schema } from '@ovotech/json-schema';

interface Test {
  description: string;
  data: unknown;
  valid: boolean;
}

interface Suite {
  description: string;
  schema: Schema;
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
  .get('/subSchemas-defs.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/subSchemas-defs.json'))
  .get('/folder/folderInteger.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/folder/folderInteger.json'))
  .get('/name.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/name.json'))
  .get('/name-defs.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/name-defs.json'));

nock('http://json-schema.org')
  .persist()
  .get('/draft-04/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-4/schema.json'))
  .get('/draft-06/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-6/schema.json'))
  .get('/draft-07/schema')
  .replyWithFile(200, join(draftsFolder, 'draft-7/schema.json'));

nock('https://json-schema.org')
  .persist()
  .get('/draft/2019-09/schema')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/schema.json'))
  .get('/draft/2019-09/meta/core')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/core.json'))
  .get('/draft/2019-09/meta/applicator')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/applicator.json'))
  .get('/draft/2019-09/meta/validation')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/validation.json'))
  .get('/draft/2019-09/meta/meta-data')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/meta-data.json'))
  .get('/draft/2019-09/meta/format')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/format.json'))
  .get('/draft/2019-09/meta/content')
  .replyWithFile(200, join(draftsFolder, 'draft/2019-09/meta/content.json'));

const adapters = [ajv, jsonSchema];
const testFolders = ['draft7'];

const benchmarkSuite = new Benchmark.Suite();

benchmarkSuite.on('cycle', (event: Benchmark.Event) => {
  console.log(String(event.target));
});

for (const adapter of adapters) {
  benchmarkSuite.add(adapter.name, {
    defer: true,
    fn: async (deffered: { resolve: () => void }) => {
      for (const testFolder of testFolders) {
        const testFiles = readdirSync(join(testSuiteFolder, 'tests', testFolder))
          .filter((file) => file.endsWith('.json'))
          .map<Suite[]>((file) =>
            JSON.parse(String(readFileSync(join(testSuiteFolder, 'tests', testFolder, file)))),
          );

        for (const suites of testFiles) {
          for (const suite of suites) {
            const validator = await adapter.compile(suite.schema);
            for (const test of suite.tests) {
              const result = validator(test.data);
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
