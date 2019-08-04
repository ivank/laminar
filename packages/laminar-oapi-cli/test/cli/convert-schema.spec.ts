import { Schema } from '@ovotech/json-schema';
import { readdirSync, readFileSync } from 'fs';
import nock = require('nock');
import { join } from 'path';
import { schemaTs } from '../../src';

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

const testSuiteFolder = join(__dirname, '../../../../external/JSON-Schema-Test-Suite');
const draftsFolder = join(__dirname, '../../../../external/json-schema-drafts');

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

const testFolders = ['draft4', 'draft6', 'draft7'];

for (const testFolder of testFolders) {
  const testFiles = readdirSync(join(testSuiteFolder, 'tests', testFolder))
    .filter(file => file.endsWith('.json'))
    .map<[string, Suite[]]>(file => [
      file,
      JSON.parse(String(readFileSync(join(testSuiteFolder, 'tests', testFolder, file)))),
    ]);

  for (const [name, suites] of testFiles) {
    describe(`${testFolder} ${name}`, () => {
      it.each<[string, Schema]>(suites.map(suite => [suite.description, suite.schema]))(
        'Test %s',
        async (description, schema) => {
          const ts = await schemaTs(schema);
          expect({ ts, schema }).toMatchSnapshot();
        },
      );
    });
  }
}
