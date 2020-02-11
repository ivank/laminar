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

    const context = withImports(
      withIdentifier(
        withIdentifier(initial, Type.Alias({ name: 'test', type: Type.Str })),
        Node.Const({ name: 'a', value: { test1: 'other', k: 12 }, multiline: true }),
      ),
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
