# JSON Schema

A lightweight a json-schema.

Dependencies:

- js-yaml
- node-fetch

Supported JSON Schema drafts

- draft-4
- draft-5
- draft-7
- draft-2019-09

### Usage

```shell
yarn add @ovotech/json-schema
```

> [examples/simple.ts](examples/simple.ts)

```typescript
import { validate, Schema } from '@ovotech/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const value = '12horses';

validate({ schema, value }).then((result) => console.log(result.valid, result.errors));
```

Should output

```
false
[ '[value] should match email format' ]
```

### Compare to other implementations

It is comparatively slower than the venerable [Ajv](https://github.com/epoberezkin/ajv) but is a lot simpler and smaller. It also passes the official [json-schema-org/JSON-Schema-Test-Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite).

It does not rely on any shared state or static parameters returning all the errors for a given validation operation in one result. Which was one of the reasons to develop an alternative to Ajv in the first place.

It was made as a lightweight dependency to [@ovotech/laminar](https://github.com/ovotech/laminar) framework with nice error messages.

### Examples

#### Compile and Validate

If we assume we have those 2 http resources at the given URLs, You can compile the schema once, downloading the relevant URLs, and then use the `CompiledSchema` to perform any further validation without downloading and parsing the files again.

> [examples/compile-urls.ts](examples/compile-urls.ts)

```typescript
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
```

#### Load local files

You can also provide paths to local files to download the schema from. It it ends with "yaml" or "yml" it would be loaded as YAML, otherwise it would be parsed as JSON.

> [examples/validate-local-schema.ts](examples/validate-local-schema.ts)

```typescript
import { validateCompiled, validate, compile } from '@ovotech/json-schema';
import { join } from 'path';

const schema = join(__dirname, 'color-schema.yaml');

validate({ schema, value: 'orange' }).then((result) => {
  console.log('validate', result.valid, result.errors);
});

compile({ schema }).then((compiledSchema) => {
  const result = validateCompiled({ schema: compiledSchema, value: 'red' });

  console.log('compile', result.valid, result.errors);
});
```

### API

**validate** validate given data with a schema. The schema can be a path to a yaml / json file, or a url to one, as well as plain old js object with the said schema.

```typescript
function async validate(schema: Schema | string | CompiledSchema, data: unkown) => Promise<{
  schema: Schema,
  valid: boolean,
  errors: string[],
}>
```

**compile** Compile a schema by downloading any dependencies, resolving json refs or loading yaml / json files from URLs or file paths. The result can be passed to validate to skip the downloading.

```typescript
function async compile(schema: Schema | string) => Promise<CompiledSchema>
```

**validateCompiled** You can pass the compiled schema and it will process the schema synchronously, without the use of Promises.

```typescript
function async validateCompiled(schema: CompiledSchema, data: unkown) => {
  schema: Schema,
  valid: boolean,
  errors: string[],
}
```

**ensureValid** Ensure that a given value is of a typescript type, using json-schema

```typescript
function async ensureValid<T>(schema: CompiledSchema, data: unkown) => data as T
```

### Develop

```
yarn
yarn test
```
