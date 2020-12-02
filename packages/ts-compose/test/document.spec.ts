import { document, DocumentContext, printDocument, Type, Node, withIdentifier, withImports } from '../src';
import { withHeader } from '../src/document';

describe('Document', () => {
  it('Test print document with context', () => {
    const initial: DocumentContext = { imports: {}, identifiers: {}, namespaces: {}, headers: [] };

    const test = Type.Alias({ name: 'test', type: Type.String });
    const test2 = Node.Const({ name: 'z1', value: '123' });
    const test3 = Type.Interface({
      name: 'z2',
      props: [
        Type.Prop({ name: 'value', type: Type.Number }),
        Type.Prop({ name: 'other', type: Type.Referance('test') }),
      ],
    });
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
    const c6 = withIdentifier(c5, test2, 'FirstNamespace');
    const c7 = withIdentifier(c6, test3, 'FirstNamespace');
    const c8 = withIdentifier(c7, test2, 'OtherNamespace');
    const c9 = withIdentifier(c8, test3, 'OtherNamespace');

    const c10 = withHeader(c9, '/* test */');
    const c11 = withHeader(c10, '// other');

    const context = withIdentifier(c11, b);

    const doc = document(
      context,
      Type.Interface({
        name: 'Orange',
        props: [
          Type.Prop({ name: 'value', type: Type.Number }),
          Type.Prop({ name: 'other', type: Type.Referance('test') }),
        ],
      }),
    );

    const source = printDocument(doc);
    expect(source).toMatchSnapshot();
  });
});
