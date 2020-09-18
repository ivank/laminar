import { validate, compile } from '@ovotech/json-schema';
import * as nock from 'nock';

const mainSchema = `
{
  "type": "object",
  "properties": {
    "size": {
      "type": "number"
    },
    "color": { "$ref": "https://example.com/color" }
  }
}
`;

const colorSchema = `
enum:
  - red
  - green
  - blue
`;

nock('https://example.com')
  .get('/schema')
  .reply(200, mainSchema, { 'Content-Type': 'application/json' })
  .get('/color')
  .reply(200, colorSchema, { 'Content-Type': 'application/yaml' });

compile('https://example.com/schema').then((schema) => {
  console.log(schema);

  const correct = { size: 10, color: 'red' };
  const incorrect = { size: 'big', color: 'orange' };

  validate({ schema, value: correct }).then((result) => {
    console.log(result.valid, result.errors);
  });

  validate({ schema, value: incorrect }).then((result) => {
    console.log(result.valid, result.errors);
  });
});
