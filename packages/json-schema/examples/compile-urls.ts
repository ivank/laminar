import { validate, compile } from '@laminarjs/json-schema';
import nock from 'nock';

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

  const correctResult = validate({ schema, value: correct });
  console.log(correctResult.valid, correctResult.errors);

  const incorrectResult = validate({ schema, value: incorrect });
  console.log(incorrectResult.valid, incorrectResult.errors);
});
