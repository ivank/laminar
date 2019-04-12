import { JsonSchema, PrimitiveType, Schema } from '@ovotech/json-schema';

enum AST {
  NULL,
  BOOLEAN,
  STRING,
  STRING_LITERAL,
  NUMBER_LITERAL,
  BOOLEAN_LITERAL,
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
  annotate?: {
    [key: string]: string | number | boolean | undefined;
  };
}

interface BasicNode extends AstNode {
  type: AST.STRING | AST.BOOLEAN | AST.NUMBER | AST.ANY | AST.VOID | AST.NULL;
}

interface LiteralStringNode extends AstNode {
  type: AST.STRING_LITERAL;
  value: string;
}

interface LiteralNumberNode extends AstNode {
  type: AST.NUMBER_LITERAL;
  value: number;
}

interface LiteralBooleanNode extends AstNode {
  type: AST.BOOLEAN_LITERAL;
  value: boolean;
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
  | LiteralBooleanNode
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

export const astType = (type: PrimitiveType, context: AstContext): Node => {
  switch (type) {
    case 'null':
      return { type: AST.NULL, context };
    case 'integer':
    case 'number':
      return { type: AST.NUMBER, context };
    case 'string':
      return { type: AST.STRING, context };
    case 'array':
      return { type: AST.ARRAY, value: { type: AST.ANY, context }, context };
    case 'object':
      return { type: AST.OBJECT, props: {}, context };
    case 'boolean':
      return { type: AST.BOOLEAN, context };
  }
};

const astArrayType: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && Array.isArray(schema.type)) {
    const values = schema.type.map(type => astType(type, context));

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
    ? {
        context,
        type: AST.STRING,
        annotate: {
          pattern: schema.pattern,
          minLength: schema.minLength,
          maxLength: schema.maxLength,
          format: schema.format,
        },
      }
    : null;

const astNumber: AstConvert<BasicNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMinimum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? {
        context,
        type: AST.NUMBER,
        annotate: {
          minimum: schema.minimum,
          exclusiveMinimum: schema.exclusiveMinimum,
          maximum: schema.maximum,
          exclusiveMaximum: schema.exclusiveMaximum,
          format: schema.format,
        },
      }
    : null;

const astLiteral = (value: any, context: AstContext): Node => {
  switch (typeof value) {
    case 'string':
      return { type: AST.STRING_LITERAL, value, context };
    case 'number':
      return { type: AST.NUMBER_LITERAL, value, context };
    case 'boolean':
      return { type: AST.BOOLEAN_LITERAL, value, context };
    default:
      return { type: AST.ANY, context };
  }
};

const astEnum: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.enum && Array.isArray(schema.enum)) {
    const values = schema.enum.map(value => astLiteral(value, context));
    return { type: AST.UNION, context, values };
  } else {
    return null;
  }
};

const astConst: AstConvert = (schema, context) =>
  isJsonSchema(schema) && schema.const !== undefined ? astLiteral(schema.const, context) : null;

const astRef: AstConvert<RefNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.$ref) {
    const [, pointer] = schema.$ref.split('#');
    const identifier = pointer.split('/').reverse()[0];
    if (context.registry[identifier]) {
      return { type: AST.REF, ref: identifier, context };
    } else {
      const refered = getJsonPointer(context.root, pointer);
      const referedRegistry: Registry = {
        ...context.registry,
        [identifier]: { type: AST.ANY, context },
      };
      const referedNode: Node = refered
        ? jsonSchemaToAST(refered, { ...context, registry: referedRegistry })
        : { type: AST.ANY, context };

      const registry: Registry = {
        ...context.registry,
        ...referedNode.context.registry,
        [identifier]: referedNode,
      };

      return { type: AST.REF, ref: identifier, context: { ...context, registry } };
    }
  } else {
    return null;
  }
};

const jsonSchemaArrayToAST = (schema: Schema[], context: AstContext) =>
  schema.reduce<{ values: Node[]; context: AstContext }>(
    (all, item) => {
      const value = jsonSchemaToAST(item, all.context);
      return { values: [...all.values, value], context: value.context };
    },
    { values: [], context },
  );

const astObject: AstConvert<ObjectNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.properties !== undefined) {
    const additionalProperties: Node | undefined = isJsonSchema(schema.additionalProperties)
      ? jsonSchemaToAST(schema.additionalProperties, context)
      : schema.additionalProperties !== false
      ? { type: AST.ANY, context }
      : undefined;

    return Object.entries(schema.properties).reduce<ObjectNode>(
      (all, [key, value]) => {
        const type = jsonSchemaToAST(value, all.context);
        const optional = !(Array.isArray(schema.required) && schema.required.includes(key));

        return {
          ...all,
          context: type.context,
          props: { ...all.props, [key]: { optional, type } },
        };
      },
      {
        type: AST.OBJECT,
        props: {},
        additionalProperties,
        context: additionalProperties ? additionalProperties.context : context,
      },
    );
  } else {
    return null;
  }
};

const astOneOf: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    return { type: AST.UNION, ...jsonSchemaArrayToAST(schema.oneOf, context) };
  } else {
    return null;
  }
};

const astAnyOf: AstConvert<UnionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.anyOf && Array.isArray(schema.anyOf)) {
    return { type: AST.UNION, ...jsonSchemaArrayToAST(schema.anyOf, context) };
  } else {
    return null;
  }
};

const astAllOf: AstConvert<IntersectionNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    return { type: AST.INTERSECTION, ...jsonSchemaArrayToAST(schema.allOf, context) };
  } else {
    return null;
  }
};

const astArray: AstConvert<ArrayNode | TupleNode> = (schema, context) => {
  if (isJsonSchema(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        return { type: AST.TUPLE, ...jsonSchemaArrayToAST(schema.items, context) };
      } else {
        const types = jsonSchemaArrayToAST(
          schema.items.concat(isJsonSchema(schema.additionalItems) ? [schema.additionalItems] : []),
          context,
        );

        return {
          type: AST.ARRAY,
          context: types.context,
          value: {
            type: AST.UNION,
            ...types,
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
  astEnum,
  astBoolean,
  astString,
  astNumber,
  astRef,
  astObject,
  astOneOf,
  astAnyOf,
  astAllOf,
  astArray,
  astArrayType,
  astConst,
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

export const wrapItems = (items: string[], delimiter: string, maxWidth = 80) => {
  const singleLine = items.join(delimiter);
  return singleLine.length > maxWidth
    ? '\n' + items.map(item => indent(item, delimiter)).join('\n') + '\n'
    : singleLine;
};

export const astToTS = (node: Node): string => {
  switch (node.type) {
    case AST.NULL:
      return 'null';
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
    case AST.BOOLEAN_LITERAL:
      return String(node.value);
    case AST.VOID:
      return 'void';
    case AST.BOOLEAN:
      return 'boolean';
    case AST.UNION:
      return wrapItems(node.values.map(item => astToTS(item)), ' | ');
    case AST.INTERSECTION:
      return wrapItems(node.values.map(item => astToTS(item)), ' & ');
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
          const propAnnotate = type.annotate
            ? Object.entries(type.annotate)
                .filter(([key, value]) => value !== undefined)
                .map(([key, value]) => `@${key}: ${value}`)
                .join('\n')
            : '';
          const propDesc = type.description ? `${type.description}\n` : '';
          const fullDesc =
            propAnnotate || propDesc ? wrapDescription(propDesc + propAnnotate) + '\n' : '';

          return `${fullDesc}${name}${optional ? '?' : ''}: ${astToTS(type)};`;
        });
      return `{\n${indent(props.join('\n'))}\n}`;
    case AST.REF:
      return node.ref;
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
