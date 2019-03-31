import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Schema, validate } from '../src';

interface Test {
  description: string;
  data: any;
  valid: boolean;
}

interface Suite {
  description: string;
  schema: Schema;
  tests: Test[];
}

const draft7 = readdirSync(join(__dirname, 'draft7'))
  .filter(file => file.endsWith('.json'))
  .map<[string, Suite[]]>(file => [
    file,
    JSON.parse(String(readFileSync(join(__dirname, 'draft7', file)))),
  ]);

for (const [name, suites] of draft7) {
  describe(`Draft7 ${name}`, () => {
    for (const suite of suites) {
      const tests = suite.tests.map<[string, any, boolean]>(test => [
        test.description,
        test.data,
        test.valid,
      ]);

      it.each<[string, any, boolean]>(tests)(
        `Should test ${suite.description}: %s`,
        async (testName, data, expected) => {
          const errors = await validate(suite.schema, data);
          if ((errors.length === 0) !== expected) {
            console.log(testName, suite.schema, data, errors);
          }
          expect(errors.length === 0).toBe(expected);
        },
      );
    }
  });
}
