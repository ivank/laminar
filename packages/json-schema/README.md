# JSON Schema

A lightweight a json-schema.

Dependencies:

- yaml
- axios

Supported JSON Schema drafts

- draft-4
- draft-5
- draft-7
- draft-2019-09
- openapi3 (The json-schema variant that's used by OpenApi 3: https://swagger.io/docs/specification/data-models/keywords/)

### Usage

```shell
yarn add @laminar/json-schema
```

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/json-schema/examples/simple.ts)

```typescript
import { validate, Schema } from '@laminar/json-schema';

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

It was made as a lightweight dependency to [@laminar/laminar](https://github.com/ivank/laminar) framework with nice error messages.

### Examples

#### Compile and Validate

If we assume we have those 2 http resources at the given URLs, You can compile the schema once, downloading the relevant URLs, and then use the `CompiledSchema` to perform any further validation without downloading and parsing the files again.

> [examples/compile-urls.ts](https://github.com/ivank/laminar/tree/main/packages/json-schema/examples/compile-urls.ts)

```typescript
import { validate, compile } from '@laminar/json-schema';
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
```

#### Load local files

You can also provide paths to local files to download the schema from. It it ends with "yaml" or "yml" it would be loaded as YAML, otherwise it would be parsed as JSON.

> [examples/validate-local-schema.ts](https://github.com/ivank/laminar/tree/main/packages/json-schema/examples/validate-local-schema.ts)

```typescript
import { validateCompiled, validate, compile } from '@laminar/json-schema';
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

#### Custom error messages

You can customize error messages with `formatErrors` option. It gets the full validaiton with its errors, and should return an array of string error messages.

> [examples/format-errors.ts:(format-errors)](https://github.com/ivank/laminar/tree/main/packages/json-schema/examples/format-errors.ts#L10-L15)

```typescript
const formatErrors: FormatErrors = (validation) =>
  validation.errors.map((error) => ` - ${error.code} : ${error.name} \n`);

validate({ schema, value, formatErrors }).then((result) => console.log(result.valid, result.errors));
```

The possible error codes are:

> [src/validation.ts:(error-codes)](https://github.com/ivank/laminar/tree/main/packages/json-schema/src/validation.ts#L4-L32)

```typescript
export type InvalidCode =
  | 'not'
  | 'enum'
  | 'type'
  | 'multipleOf'
  | 'minimum'
  | 'exclusiveMinimum'
  | 'maximum'
  | 'exclusiveMaximum'
  | 'pattern'
  | 'format'
  | 'false'
  | 'maxLength'
  | 'minLength'
  | 'contains'
  | 'additionalProperties'
  | 'unevaluatedProperties'
  | 'unevaluatedItems'
  | 'required'
  | 'minProperties'
  | 'maxProperties'
  | 'dependencies'
  | 'uniqueItems'
  | 'minItems'
  | 'maxItems'
  | 'oneOf'
  | 'anyOf';
```

Alternatively, you can set `formatErrors` to false and receive the raw error message objects.

> [examples/raw-errors.ts:(format-errors)](https://github.com/ivank/laminar/tree/main/packages/json-schema/examples/raw-errors.ts#L10-L12)

```typescript
validate({ schema, value, formatErrors: false }).then((result) => console.log(result.valid, result.errors));
```

```
### API

**validate** validate given data with a schema. The schema can be a path to a yaml / json file, or a url to one, as well as plain old js object with the said schema.

**compile** Compile a schema by downloading any dependencies, resolving json refs or loading yaml / json files from URLs or file paths. The result can be passed to validate to skip the downloading.

**validateCompiled** You can pass the compiled schema and it will process the schema synchronously, without the use of Promises.

**ensureValid** Ensure that a given value is of a typescript type, using json-schema

**coerce** Coerce a given value, using the provided json schema.

- With type: 'json'
  This is used to convert json validated with json schema into javascript objects.
  Namely it converts all the strings with format date and date-time into Date objects.
- With type: 'query'
  To convert a value coming from a URL query string to the type you want it to be,
  for example '12' with type: 'integer' will be converted to 12 so the validation can succeed.

Additionally, we assign default values where appropriate.

### Develop

```

yarn
yarn test

```

```
