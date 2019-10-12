import { resolveRefs } from '../src';
import * as nock from 'nock';

// Hardcode what would be the result of an http request
nock('https://example.com')
  .get('/assets/test.yaml')
  .reply(200, `UserResponse: { type: object }`, { 'Content-Type': 'application/yaml' });

const schema = {
  test: { $ref: 'https://example.com/assets/test.yaml#/UserResponse' },
};

resolveRefs(schema).then(resolved => {
  console.dir(resolved, { depth: 3 });
});
