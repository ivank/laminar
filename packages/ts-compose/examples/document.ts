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
const rootDocument = document(rootEntity.context, Type.Alias({ name: 'Root', type: rootEntity.type, isExport: true }));

console.log(printDocument(rootDocument));

// Would output:
// ==========================================

export type Root = User;

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
