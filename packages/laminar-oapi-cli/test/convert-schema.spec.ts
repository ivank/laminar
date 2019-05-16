import { readdirSync, readFileSync } from 'fs';
import nock = require('nock');
import { SchemaObject } from 'openapi3-ts';
import { join } from 'path';
import { schemaTs } from '../src';

interface Test {
  description: string;
  data: any;
  valid: boolean;
}

interface Suite {
  description: string;
  schema: SchemaObject;
  tests: Test[];
}

const testSuiteFolder = join(__dirname, '../../../json-schema-test-suite');

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
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-4-schema.json'))
  .get('/draft-06/schema')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-6-schema.json'))
  .get('/draft-07/schema')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-7-schema.json'));

const testFolders = ['draft4', 'draft6', 'draft7'];

for (const testFolder of testFolders) {
  const testFiles = readdirSync(join(testSuiteFolder, testFolder))
    .filter(file => file.endsWith('.json'))
    .map<[string, Suite[]]>(file => [
      file,
      JSON.parse(String(readFileSync(join(testSuiteFolder, testFolder, file)))),
    ]);

  for (const [name, suites] of testFiles) {
    describe(`${testFolder} ${name}`, () => {
      it.each<[string, SchemaObject]>(suites.map(suite => [suite.description, suite.schema]))(
        'Test %s',
        async (description, schema) => {
          const ts = await schemaTs(schema);
          expect({ ts, schema }).toMatchSnapshot();
        },
      );
    });
  }
}
