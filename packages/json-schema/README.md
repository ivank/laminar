# JSON Schema

A lightweight a json-schema. No external dependencies (one small dependency from the same repository).

### Usage

```shell
yarn add @ovotech/json-schema
```

```typescript
import { validate, Schema } from '@ovotech/json-schema';

const schema: Schema = {
  type: 'string',
  format: 'email',
};

const data = '12horses';

const result = await validate(schema, data);
console.log(result.valid);
console.log(result.errors);
```

Should output

```
false
[ '[value] should match email format' ]
```

### Compare to other implementations

It is comparatively slower than the venerable [Ajv](https://github.com/epoberezkin/ajv) but is a lot simpler and smaller. It also passes the official [json-schema-org/JSON-Schema-Test-Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite).

It is also does not rely on any shared state or static parameters returning all the errors for a given validation operation in one result. Which was one of the reasons to develop an alternative to Ajv in the first place.

It was made as a lightweight dependency to [@ovotech/laminar](https://github.com/ovotech/laminar) framework with nice error messages.

### Examples

#### Compile and Validate

If we assume we have those 2 http resources at the given URLs:

`https://example.com/schema`

```json
{
  "type": "object",
  "properties": {
    "size": {
      "type": "number"
    },
    "color": { "$ref": "https://example.com/color" }
  }
}
```

`https://example.com/color`

```yaml
enum:
  - red
  - green
  - blue
```

You can compile the schema once, downloading the relevant URLs, and then use the `CompiledSchema` to perform any further validation without downloading and parsing the files again.

```typescript
import { validate, compile } from '@ovotech/json-schema';

compile('https://example.com/schema').then(schema => {
  console.log(schema);

  const correctData = { size: 10, color: 'red' };
  const incorrectData = { size: 'big', color: 'orange' };

  validate(schema, correctData).then(result => {
    console.log(result.valid, result.errors);
  });

  validate(schema, incorrectData).then(result => {
    console.log(result.valid, result.errors);
  });
});
```

#### Load local files

You can also provide paths to local files to download the schema from. It it ends with "yaml" or "yml" it would be loaded as YAML, otherwise it would be parsed as JSON.

```typescript
import { validateCompiled, validate, compile } from '@ovotech/json-schema';
import { join } from 'path';

const schemaFile = join(__dirname, 'examples/color-schema.yaml');

validate(schemaFile, 'orange').then(result => {
  console.log('validate', result.valid, result.errors);
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

### Develop

```
yarn
yarn test
```
