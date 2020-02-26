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
