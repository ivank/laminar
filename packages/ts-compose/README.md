# TS Compose

A DSL on top of typescript AST to make it a bit more concise.

## Usage

> [examples/simple.ts](https://github.com/ivank/laminar/tree/main/packages/ts-compose/examples/simple.ts)

```typescript
import { Type, printNode } from '../src';

const myInterface = Type.Interface({
  name: 'MyInterface',
  props: [
    Type.Prop({
      name: 'id',
      type: Type.Number,
    }),
    Type.Prop({
      name: 'name',
      isOptional: true,
      type: Type.Union([Type.String, Type.Null]),
    }),
  ],
});

console.log(printNode(myInterface));

// Would output:
// ==========================================

interface MyInterface {
  id: number;
  name?: string | null;
}
```

## Example parser

Then you can load the types like this:

> [examples/document.ts](https://github.com/ivank/laminar/tree/main/packages/ts-compose/examples/document.ts)

```typescript
import { Type, document, mapWithContext, Document, DocumentContext } from '@laminar/ts-compose';
import { printDocument, withIdentifier } from '../src';

/**
 * Lets define a fictional nested type system
 * We can have entities with strings and numbers as fields, as well as arrays and referencas.
 * We can also define a field to be an entity inline.
 */
type Field =
  | { type: 'str' }
  | { type: 'num' }
  | { type: 'ref'; name: string }
  | { type: 'arr'; items: Field }
  | { type: 'ent'; name: string; fields: { [name: string]: Field } };

interface Entity {
  name: string;
  fields: {
    [name: string]: Field;
  };
}

/**
 * Here's how an entity like that could look like
 */
const data: Entity = {
  name: 'User',
  fields: {
    id: { type: 'num' },
    name: { type: 'str' },
    posts: {
      type: 'arr',
      items: {
        type: 'ent',
        name: 'Post',
        fields: {
          id: { type: 'num' },
          title: { type: 'str' },
          content: { type: 'str' },
          user: { type: 'ref', name: 'User' },
          tags: {
            type: 'arr',
            items: {
              type: 'ent',
              name: 'Tag',
              fields: {
                size: { type: 'num' },
                name: { type: 'str' },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Now lets define the parser.
 * We want to keep track of all the entities we've parsed, since they can be defined inline.
 * That's why we have a "context" object. Its job is to keep tabs of all the references.
 *
 * A "Document" here is a combination of a typescript node and its context. { type: ..., context: ... }
 */

/**
 * Format a single field
 * @param context
 * @param field
 */
export const toFieldDocument = (context: DocumentContext, field: Field): Document => {
  switch (field.type) {
    case 'num':
      return document(context, Type.Number);
    case 'str':
      return document(context, Type.Number);
    case 'ref':
      return document(context, Type.Referance(field.name));
    case 'arr':
      const arrayType = toFieldDocument(context, field.items);
      return document(arrayType.context, Type.Array(arrayType.type));
    case 'ent':
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return toEntityDocument(context, field);
  }
};

/**
 * Format a whole entity with all of its fields
 * @param context
 * @param entity
 */
export const toEntityDocument = (context: DocumentContext, entity: Entity): Document => {
  /**
   * Allows you to keep the context of each iteration in an
   * without modifying the original context.
   */
  const props = mapWithContext(context, Object.entries(entity.fields), (fieldContext, [name, field]) => {
    const fieldDoc = toFieldDocument(fieldContext, field);
    return document(fieldDoc.context, Type.Prop({ name, type: fieldDoc.type }));
  });

  const entityInterface = Type.Interface({ name: entity.name, props: props.items });
  const contextWithEntity = withIdentifier(props.context, entityInterface);
  return document(contextWithEntity, Type.Referance(entity.name));
};

/**
 * Define an initial "Root" alias
 */
const rootEntity = toEntityDocument({}, data);
const rootDocument = document(rootEntity.context, Type.Alias({ name: 'Root', type: rootEntity.type }));

console.log(printDocument(rootDocument));

// Would output:
// ==========================================

type Root = User;

interface Tag {
  size: number;
  name: number;
}

interface Post {
  id: number;
  title: number;
  content: number;
  user: User;
  tags: Tag[];
}

interface User {
  id: number;
  name: number;
  posts: Post[];
}
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

Deployment is preferment by yarn automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
