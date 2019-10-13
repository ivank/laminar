# JSON Refs

Recursively downloads files referenced in a json-schema, and resolves all the references and provide a map to the referenced contents while its at it.

### Usage

```shell
yarn add @ovotech/json-refs
```

```typescript
import { resolveRefs } from '@ovotech/json-refs';

// Where the contents of https://example.com/assets/test.yml are
// UserResponse:
//   - type: 'object'

const schema = {
  test: { $ref: 'https://example.com/assets/test.yml#/UserResponse' },
};

const resolved = await resolveRefs(schema);

console.log(resolved);
```

Should output

```js
{ schema:
   { test:
      { '$ref': 'https://example.com/assets/test.yaml#/UserResponse' } },
  refs:
   { 'https://example.com/assets/test.yaml': { UserResponse: { type: 'object' } },
     'https://example.com/assets/test.yaml#/UserResponse': { type: 'object' } },
  uris: [ 'https://example.com/assets/test.yaml' ] }
```

The resolved refs include all files with their parsed contents (yaml or json), as well as flat list of links to the individual refs.
There is also a list of all the files downloaded or local file referenced in `uris`.

### Behavior

First of all it would parse the schema, searching for `$refs` if the refs are in the file itself then it would just return those. If there are any external links, it would collect all the URLs present, and would download all of them in parallel. If there are any external links in the downloaded files, it would attempt another batch, until all resources are resolved.

Since it would fill in its internal reference library on each pass, circular references are allowed and would only be resolved once.

### Api

**resolveRefs**

```typescript
function async resolveRefs(schema: JsonPointerObject) => Promise<{
  schema: JsonPointerObject,
  refs: { [key: string]: JsonPointerObject,
  uris: string[]
}>
```

**resolveRefsFile** The same as resolveRefs, but start with downloading and or parsing the initial schema. Can take any url or path to a local file.

```typescript
function async resolveRefsFile(file: string) => Promise<{
  schema: JsonPointerObject,
  refs: { [key: string]: JsonPointerObject,
  uris: string[]
}>
```

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by lerna automatically on merge / push to master, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
