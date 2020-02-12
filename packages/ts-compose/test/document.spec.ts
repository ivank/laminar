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

    const c1 = withImports(initial, {
      module: 'utils',
      named: [{ name: 'inspect' }, { name: 'tmp' }],
    });

    const c2 = withImports(c1, {
      module: 'utils',
      named: [{ name: 'inspect' }, { name: 'other', as: 'Other' }],
    });

    const c3 = withImports(c2, { module: 'utils', defaultAs: 'MyTest' });
    const c4 = withIdentifier(c3, test);
    const c5 = withIdentifier(c4, a);
    const context = withIdentifier(c5, b);

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
