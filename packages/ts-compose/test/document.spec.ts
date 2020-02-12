import {
  document,
  DocumentContext,
  printDocument,
  Type,
  Node,
  withIdentifier,
  withImports,
} from '../src';

describe('Document', () => {
  it('Test print document with context', () => {
    const initial: DocumentContext = { imports: {}, identifiers: {} };

    const test = Type.Alias({ name: 'test', type: Type.Str });
    const a = Node.Const({ name: 'a', value: { test1: 'other', k: 12 }, multiline: true });
    const b = Node.Enum({
      name: 'b',
      members: [Node.EnumMember({ name: 'v1' }), Node.EnumMember({ name: 'v2' })],
    });

    const context = withImports(
      withIdentifier(withIdentifier(withIdentifier(initial, test), a), b),
      'utils',
      ['inspect', 'tmp'],
    );

    const doc = document(
      context,
      Type.Interface({
        name: 'Orange',
        props: [
          Type.Prop({ name: 'value', type: Type.Num }),
          Type.Prop({ name: 'other', type: Type.Ref('test') }),
        ],
      }),
    );

    const source = printDocument(doc);
    expect(source).toMatchSnapshot();
  });
});
