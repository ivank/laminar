import { JsonSchema, Schema } from '@ovotech/json-schema';

enum AST {
  BOOLEAN,
  STRING,
  STRING_LITERAL,
  NUMBER_LITERAL,
  NUMBER,
  OBJECT,
  UNION,
  INTERSECTION,
  VOID,
  ANY,
  ARRAY,
  TUPLE,
  REF,
}

interface Registry {
  [key: string]: Node;
}

interface AstContext {
  root: Schema;
  registry: Registry;
}

interface AstNode {
  type: AST;
  context: AstContext;
  description?: string;
}

interface BasicNode extends AstNode {
  type: AST.STRING | AST.BOOLEAN | AST.NUMBER | AST.ANY | AST.VOID;
}

interface LiteralStringNode extends AstNode {
  type: AST.STRING_LITERAL;
  value: string;
}

interface LiteralNumberNode extends AstNode {
  type: AST.NUMBER_LITERAL;
  value: number;
}

interface ArrayNode extends AstNode {
  type: AST.ARRAY;
  value: Node;
}

interface TupleNode extends AstNode {
  type: AST.TUPLE;
  values: Node[];
}

interface RefNode extends AstNode {
  type: AST.REF;
  ref: string;
}

interface UnionNode extends AstNode {
  type: AST.UNION;
  values: Node[];
}

interface IntersectionNode extends AstNode {
  type: AST.INTERSECTION;
  values: Node[];
}

interface ObjectProps {
  [type: string]: {
    optional: boolean;
    type: Node;
  };
}

interface ObjectNode extends AstNode {
  type: AST.OBJECT;
  props: ObjectProps;
  additionalProperties?: Node;
}

type Node =
  | BasicNode
  | RefNode
  | ObjectNode
  | UnionNode
  | LiteralStringNode
  | LiteralNumberNode
  | IntersectionNode
  | TupleNode
  | ArrayNode;

export const parseJsonPointer = (name: string) =>
  decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

export const getJsonPointer = (document: any, pointer: string) =>
  pointer
    .split('/')
    .reduce<any>(
      (item, name) => (name ? (item ? item[parseJsonPointer(name)] : undefined) : item),
      document,
    );

type AstConvert<TNode = Node> = (schema: Schema, context: AstContext) => TNode | null;

export const isJsonSchema = (schema: any): schema is JsonSchema =>
  schema && typeof schema === 'object';

const astArrayType: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && Array.isArray(schema.type)) {
    const values = schema.type.map(type => jsonSchemaToAST({ type }, context));

    return {
      type: AST.UNION,
      context,
      values,
    };
  } else {
    return null;
  }
};

const astBooleanSchema: AstConvert<BasicNode> = (schema, context) =>
  typeof schema === 'boolean' ? { context, type: schema === true ? AST.ANY : AST.VOID } : null;

const astBoolean: AstConvert<BasicNode> = (schema, context) =>
  isJsonSchema(schema) && schema.type === 'boolean' ? { context, type: AST.BOOLEAN } : null;
const astString: AstConvert<BasicNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.minLength !== undefined ||
    schema.maxLength !== undefined)
    ? { context, type: AST.STRING }
    : null;

const astNumber: AstConvert<BasicNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMaximum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? { context, type: AST.NUMBER }
    : null;

const astEnum: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.type === 'enum' && Array.isArray(schema.enum)) {
    return {
      type: AST.UNION,
      context,
      values: schema.enum.map(value => {
        if (typeof value === 'string') {
          return { type: AST.STRING_LITERAL, value, context };
        } else if (typeof value === 'number') {
          return { type: AST.NUMBER_LITERAL, value, context };
        } else {
          return { type: AST.ANY, context };
        }
      }),
    };
  } else {
    return null;
  }
};

const astRef: AstConvert<RefNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.$ref) {
    const [, pointer] = schema.$ref.split('#');
    const identifier = pointer.split('/').reverse()[0];
    if (context.registry[identifier]) {
      return { type: AST.REF, ref: identifier, context };
    } else {
      const refered = getJsonPointer(context.root, pointer);
      const registry: Registry = {
        ...context.registry,
        [identifier]: refered ? jsonSchemaToAST(refered, context) : { type: AST.ANY, context },
      };

      return { type: AST.REF, ref: identifier, context: { ...context, registry } };
    }
  } else {
    return null;
  }
};

const combineContext = (items: Node[], context: AstContext): AstContext =>
  items.reduce(
    (all, item) => ({ root: all.root, registry: { ...all.registry, ...item.context.registry } }),
    context,
  );

const astObject: AstConvert<ObjectNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.properties !== undefined) {
    const props = Object.entries(schema.properties).reduce<ObjectProps>(
      (all, [key, value]) => ({
        ...all,
        [key]: {
          optional: !(Array.isArray(schema.required) && schema.required.includes(key)),
          type: jsonSchemaToAST(value, context),
        },
      }),
      {},
    );
    const additionalProperties: Node | undefined = isJsonSchema(schema.additionalProperties)
      ? jsonSchemaToAST(schema.additionalProperties, context)
      : schema.additionalProperties !== false
      ? { type: AST.ANY, context }
      : undefined;

    const namedNodes = Object.values(props).map(item => item.type);
    const allNodes = additionalProperties ? [...namedNodes, additionalProperties] : namedNodes;

    return {
      type: AST.OBJECT,
      context: combineContext(allNodes, context),
      additionalProperties,
      props,
    };
  } else {
    return null;
  }
};

const astOneOf: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const values = schema.oneOf.map(item => jsonSchemaToAST(item, context));
    return { type: AST.UNION, context: combineContext(values, context), values };
  } else {
    return null;
  }
};

const astAnyOf: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    const values = schema.allOf.map(item => jsonSchemaToAST(item, context));
    return { type: AST.UNION, context: combineContext(values, context), values };
  } else {
    return null;
  }
};

const astAllOf: AstConvert<IntersectionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const values = schema.oneOf.map(item => jsonSchemaToAST(item, context));
    return { type: AST.INTERSECTION, context: combineContext(values, context), values };
  } else {
    return null;
  }
};

const astArray: AstConvert<ArrayNode | TupleNode> = (schema, context) => {
  if (isJsonSchema(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        const values = schema.items.map(item => jsonSchemaToAST(item, context));
        return { type: AST.TUPLE, context: combineContext(values, context), values };
      } else {
        const values = [
          ...schema.items,
          ...(isJsonSchema(schema.additionalItems) ? [schema.additionalItems] : []),
        ].map(item => jsonSchemaToAST(item, context));

        const arrayContext = combineContext(values, context);

        return {
          type: AST.ARRAY,
          context: arrayContext,
          value: {
            type: AST.UNION,
            context: arrayContext,
            values,
          },
        };
      }
    } else {
      const value: Node = schema.items
        ? jsonSchemaToAST(schema.items, context)
        : { type: AST.ANY, context };

      return { type: AST.ARRAY, context: value.context, value };
    }
  } else {
    return null;
  }
};

const enrichAst = (schema: Schema, node: Node | null): Node | null =>
  node ? (isJsonSchema(schema) ? { ...node, description: schema.description } : node) : node;

const converters: AstConvert[] = [
  astBooleanSchema,
  astBoolean,
  astString,
  astNumber,
  astEnum,
  astObject,
  astOneOf,
  astAnyOf,
  astAllOf,
  astArray,
  astArrayType,
  astRef,
];

export const jsonSchemaToAST = (schema: Schema, context: AstContext): Node =>
  converters.reduce<Node | null>(
    (ast, converter) => ast || enrichAst(schema, converter(schema, context)),
    null,
  ) || {
    type: AST.ANY,
    context,
  };

export const indent = (str: string, ind = '  ') =>
  str
    .split('\n')
    .map(line => ind + line)
    .join('\n');

export const wrapDescription = (description: string) =>
  ['/**', indent(description, ' * '), ' */'].join('\n');

export const astToTS = (node: Node): string => {
  switch (node.type) {
    case AST.ANY:
      return 'any';
    case AST.NUMBER:
      return 'number';
    case AST.STRING:
      return 'string';
    case AST.STRING_LITERAL:
      return `"${node.value}"`;
    case AST.NUMBER_LITERAL:
      return String(node.value);
    case AST.VOID:
      return 'void';
    case AST.BOOLEAN:
      return 'boolean';
    case AST.UNION:
      return node.values.map(item => astToTS(item)).join(' | ');
    case AST.ARRAY:
      return `Array<${astToTS(node.value)}>`;
    case AST.TUPLE:
      return `[${node.values.map(item => astToTS(item)).join(', ')}]`;
    case AST.OBJECT:
      const props = Object.entries(node.props)
        .concat(
          node.additionalProperties
            ? [['[key: string]', { optional: false, type: node.additionalProperties }]]
            : [],
        )
        .map(([name, { optional, type }]) => {
          const propDesc = type.description ? wrapDescription(type.description) + '\n' : '';
          return `${propDesc}${name}${optional ? '?' : ''}: ${astToTS(type)};`;
        });
      return `{\n${indent(props.join('\n'))}\n}`;
    case AST.REF:
      return node.ref;
    case AST.INTERSECTION:
      return node.values.map(item => astToTS(item)).join(' & ');
  }
};

export const registryToTs = (registry: Registry) =>
  Object.entries(registry)
    .map(([key, node]) => {
      const desc = node.description ? wrapDescription(node.description) + '\n' : '';

      return node.type === AST.OBJECT
        ? `${desc}interface ${key} ${astToTS(node)}`
        : `${desc}type ${key} = ${astToTS(node)};`;
    })
    .join('\n\n');
