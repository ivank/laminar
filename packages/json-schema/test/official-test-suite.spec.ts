import { readdirSync, readFileSync } from 'fs';
import * as nock from 'nock';
import { join } from 'path';
import { validate, Schema } from '../src';

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
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace jest {
    interface Matchers<R, T> {
      toValidateAgainstSchema(value: Schema, draft: string): CustomMatcherResult;
    }
  }
}

expect.extend({
  async toValidateAgainstSchema(data, schema, draft) {
    const result = await validate({ schema, value: data, draft });
    const pass = result.valid;
    return {
      pass,
      message: pass
        ? () =>
            `Expected data:\n` +
            this.utils.printExpected(data) +
            `\nTo not be valid against schema:\n` +
            this.utils.printExpected(schema)
        : () =>
            `Expected data:\n` +
            this.utils.printExpected(data) +
            `\nTo be valid against schema:\n` +
            this.utils.printExpected(schema) +
            `but got errors:\n` +
            this.utils.printReceived(result.errors),
    };
  },
});

const testSuiteFolder = join(__dirname, '../../../external/JSON-Schema-Test-Suite');
const draftsFolder = join(__dirname, '../../../external/json-schema-drafts');

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

const testFolders = ['draft4', 'draft6', 'draft7', 'draft2019-09'];

for (const testFolder of testFolders) {
  const testFiles = readdirSync(join(testSuiteFolder, 'tests', testFolder))
    .filter((file) => file.endsWith('.json'))
    .map<[string, Suite[]]>((file) => [
      file,
      JSON.parse(String(readFileSync(join(testSuiteFolder, 'tests', testFolder, file)))),
    ]);

  for (const [name, suites] of testFiles) {
    describe(`${testFolder} ${name}`, () => {
      for (const suite of suites) {
        const tests = suite.tests.map<[string, unknown, boolean]>((test) => [
          test.description,
          test.data,
          test.valid,
        ]);

        it.each<[string, unknown, boolean]>(tests)(
          `Should test ${suite.description}: %s`,
          async (testName, data, expected) => {
            if (expected) {
              await expect(data).toValidateAgainstSchema(suite.schema, testFolder);
            } else {
              await expect(data).not.toValidateAgainstSchema(suite.schema, testFolder);
            }
          },
        );
      }
    });
  }
}
