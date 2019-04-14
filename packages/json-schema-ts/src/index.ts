import { currentId, currentUrl, extractFiles, isRefSchema } from '@ovotech/json-refs';
import { JsonSchema, PrimitiveType, Schema } from '@ovotech/json-schema';
import * as ts from 'typescript';

interface Registry {
  [key: string]: ts.TypeAliasDeclaration | ts.InterfaceDeclaration;
}

interface FilesMap {
  [file: string]: any;
}

interface AstContext {
  root: Schema;
  registry: Registry;
  files: FilesMap;
  parentId?: string;
}

interface AstNode<TNode = ts.TypeNode> {
  type: TNode;
  context: AstContext;
}

export const parseJsonPointer = (name: string) =>
  decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

export const getJsonPointer = (document: any, pointer: string) =>
  pointer
    .split('/')
    .reduce<any>(
      (item, name) => (name ? (item ? item[parseJsonPointer(name)] : undefined) : item),
      document,
    );

type AstConvert<TNode = ts.TypeNode> = (
  schema: Schema,
  context: AstContext,
) => AstNode<TNode> | null;

export const isJsonSchema = (schema: any): schema is JsonSchema =>
  schema && typeof schema === 'object';

export const nodeType = (type: PrimitiveType): ts.TypeNode => {
  switch (type) {
    case 'null':
      return ts.createNull();
    case 'integer':
    case 'number':
      return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'string':
      return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'array':
      return ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
    case 'object':
      return ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    case 'boolean':
      return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  }
};

export const astAny = (context: AstContext) => ({
  type: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  context,
});

export const astUnion = (types: ReadonlyArray<ts.TypeNode>, context: AstContext) => ({
  type: ts.createUnionTypeNode(types),
  context,
});

const convertArrayType: AstConvert<ts.UnionTypeNode> = (schema, context) =>
  isJsonSchema(schema) && Array.isArray(schema.type)
    ? astUnion(schema.type.map(nodeType), context)
    : null;

const convertBooleanSchema: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  typeof schema === 'boolean'
    ? {
        context,
        type:
          schema === true
            ? ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            : ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      }
    : null;

const convertBoolean: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) && schema.type === 'boolean'
    ? { context, type: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword) }
    : null;

const convertString: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.minLength !== undefined ||
    schema.maxLength !== undefined)
    ? {
        context,
        type: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        annotate: {
          pattern: schema.pattern,
          minLength: schema.minLength,
          maxLength: schema.maxLength,
          format: schema.format,
        },
      }
    : null;

const convertNumber: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMinimum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? {
        context,
        type: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        annotate: {
          minimum: schema.minimum,
          exclusiveMinimum: schema.exclusiveMinimum,
          maximum: schema.maximum,
          exclusiveMaximum: schema.exclusiveMaximum,
          format: schema.format,
        },
      }
    : null;

const astLiteral = (value: any): ts.TypeNode => {
  switch (typeof value) {
    case 'string':
      return ts.createLiteralTypeNode(ts.createLiteral(value));
    case 'number':
      return ts.createLiteralTypeNode(ts.createLiteral(value));
    case 'boolean':
      return ts.createLiteralTypeNode(ts.createLiteral(value));
    default:
      return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  }
};

const convertEnum: AstConvert<ts.UnionTypeNode> = (schema, context) =>
  isJsonSchema(schema) && schema.enum && Array.isArray(schema.enum)
    ? astUnion(schema.enum.map(value => astLiteral(value)), context)
    : null;

const convertConst: AstConvert = (schema, context) =>
  isJsonSchema(schema) && schema.const !== undefined
    ? { type: astLiteral(schema.const), context }
    : null;

const convertRef: AstConvert<ts.TypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && isRefSchema(schema)) {
    const [url, pointer] = schema.$ref.split('#');
    const fullUrl = currentUrl(url, context.parentId);
    const root = fullUrl ? context.files[fullUrl] : context.root;

    const identifier = pointer ? pointer.split('/').reverse()[0] : url;
    if (context.registry[identifier]) {
      return {
        type: ts.createTypeReferenceNode(identifier, undefined),
        context,
      };
    } else {
      const refered = pointer ? getJsonPointer(root, pointer) : root;

      const referedContext: AstContext = {
        ...context,
        root,
        registry: {
          ...context.registry,
          [identifier]: ts.createTypeAliasDeclaration(
            undefined,
            undefined,
            identifier,
            undefined,
            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
          ),
        },
      };

      const referedNode: AstNode = refered
        ? convertSchema(refered, referedContext)
        : astAny(context);

      const entry = ts.isTypeLiteralNode(referedNode.type)
        ? ts.createInterfaceDeclaration(
            undefined,
            undefined,
            identifier,
            undefined,
            undefined,
            referedNode.type.members,
          )
        : ts.createTypeAliasDeclaration(
            undefined,
            undefined,
            identifier,
            undefined,
            referedNode.type,
          );

      const registry: Registry = {
        ...context.registry,
        ...referedNode.context.registry,
        [identifier]: entry,
      };

      return {
        type: ts.createTypeReferenceNode(entry.name, undefined),
        context: { ...context, registry },
      };
    }
  } else {
    return null;
  }
};

const convertSchemas = (schema: Schema[], context: AstContext) =>
  schema.reduce<{ types: ts.TypeNode[]; context: AstContext }>(
    (all, item) => {
      const value = convertSchema(item, all.context);
      return { types: [...all.types, value.type], context: value.context };
    },
    { types: [], context },
  );

const convertObject: AstConvert<ts.TypeLiteralNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.properties !== undefined) {
    const additionalProperties: AstNode | undefined = isJsonSchema(schema.additionalProperties)
      ? convertSchema(schema.additionalProperties, context)
      : schema.additionalProperties !== false
      ? astAny(context)
      : undefined;

    return Object.entries(schema.properties).reduce<AstNode<ts.TypeLiteralNode>>(
      (astNode, [key, value]) => {
        const item = convertSchema(value, astNode.context);
        const optional = !(Array.isArray(schema.required) && schema.required.includes(key));
        const prop = ts.createPropertySignature(
          undefined,
          key,
          optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
          item.type,
          undefined,
        );

        return {
          type: ts.updateTypeLiteralNode(
            astNode.type,
            ts.createNodeArray(astNode.type.members.concat([prop])),
          ),
          context: item.context,
        };
      },
      {
        type: ts.createTypeLiteralNode([]),
        context: additionalProperties ? additionalProperties.context : context,
      },
    );
  } else {
    return null;
  }
};

const convertOneOf: AstConvert<ts.UnionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const schemas = convertSchemas(schema.oneOf, context);
    return astUnion(schemas.types, schemas.context);
  } else {
    return null;
  }
};

const convertAnyOf: AstConvert<ts.UnionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.anyOf && Array.isArray(schema.anyOf)) {
    const schemas = convertSchemas(schema.anyOf, context);
    return astUnion(schemas.types, schemas.context);
  } else {
    return null;
  }
};

const convertAllOf: AstConvert<ts.IntersectionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    const schemas = convertSchemas(schema.allOf, context);
    return {
      type: ts.createIntersectionTypeNode(schemas.types),
      context: schemas.context,
    };
  } else {
    return null;
  }
};

const convertArray: AstConvert<ts.TupleTypeNode | ts.ArrayTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        const schemas = convertSchemas(schema.items, context);
        return {
          type: ts.createTupleTypeNode(schemas.types),
          context: schemas.context,
        };
      } else {
        const items = convertSchemas(
          schema.items.concat(isJsonSchema(schema.additionalItems) ? [schema.additionalItems] : []),
          context,
        );

        return {
          type: ts.createArrayTypeNode(ts.createUnionTypeNode(items.types)),
          context: items.context,
        };
      }
    } else {
      const value: AstNode = schema.items ? convertSchema(schema.items, context) : astAny(context);
      return { type: ts.createArrayTypeNode(value.type), context: value.context };
    }
  } else {
    return null;
  }
};

const converters: AstConvert[] = [
  convertBooleanSchema,
  convertEnum,
  convertBoolean,
  convertString,
  convertNumber,
  convertRef,
  convertObject,
  convertOneOf,
  convertAnyOf,
  convertAllOf,
  convertArray,
  convertArrayType,
  convertConst,
];

export const convertSchema = (schema: Schema, initContext: AstContext): AstNode => {
  const parentId = currentId(schema, initContext.parentId);
  const context = { ...initContext, parentId };

  return (
    converters.reduce<AstNode | null>(
      (ast, converter) => ast || converter(schema, context),
      null,
    ) || {
      type: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
      context,
    }
  );
};

export const printAstNode = (node: AstNode): string => {
  const resultFile = ts.createSourceFile('someFileName.ts', '', ts.ScriptTarget.Latest);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const entries = Object.values(node.context.registry);
  const fullSourceFile = ts.updateSourceFileNode(resultFile, entries);

  return [
    printer.printNode(ts.EmitHint.Unspecified, node.type, fullSourceFile),
    ...entries.map(entry => printer.printNode(ts.EmitHint.Unspecified, entry, fullSourceFile)),
  ].join('\n\n');
};

export const convert = async (schema: Schema) => {
  const context: AstContext = {
    root: schema,
    files: await extractFiles(schema),
    registry: {},
  };

  const astNode = convertSchema(schema, context);

  return printAstNode(astNode);
};
