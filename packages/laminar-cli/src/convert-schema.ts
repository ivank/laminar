/* eslint-disable @typescript-eslint/no-use-before-define */
import { compile, Schema } from '@ovotech/json-schema';
import { document, Document, mapWithContext, printDocument, Type, withIdentifier } from '@ovotech/ts-compose';
import { SchemaObject } from 'openapi3-ts';
import * as ts from 'typescript';
import { AstContext, AstConvert, isSchemaObject, isReferenceObject, getReferencedObject } from './traverse';

const nodeType = (type: string): ts.LiteralTypeNode | ts.KeywordTypeNode | ts.ArrayTypeNode => {
  switch (type) {
    case 'null':
      return Type.Null;
    case 'integer':
    case 'number':
      return Type.Number;
    case 'string':
      return Type.String;
    case 'array':
      return Type.Array(Type.Any);
    case 'object':
      return Type.Object;
    case 'boolean':
      return Type.Boolean;
    default:
      return Type.Any;
  }
};

const convertArrayType: AstConvert<ts.UnionTypeNode> = (context, schema) =>
  isSchemaObject(schema) && Array.isArray(schema.type)
    ? document(context, Type.Union(schema.type.map(nodeType)))
    : null;

const convertBooleanSchema: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  typeof schema === 'boolean' ? document(context, schema === true ? Type.Any : Type.Void) : null;

const convertBoolean: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchemaObject(schema) && schema.type === 'boolean' ? document(context, Type.Boolean) : null;

const convertString: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchemaObject(schema) &&
  (schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.minLength !== undefined ||
    schema.maxLength !== undefined)
    ? document(context, Type.String)
    : null;

const convertNumber: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchemaObject(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMinimum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? document(context, Type.Number)
    : null;

const convertEnum: AstConvert<ts.UnionTypeNode> = (context, schema) =>
  isSchemaObject(schema) && schema.enum && Array.isArray(schema.enum)
    ? document(context, Type.Union(schema.enum.map(Type.Literal)))
    : null;

const convertConst: AstConvert = (context, schema) =>
  isSchemaObject(schema) && schema.const !== undefined ? document(context, Type.Literal(schema.const)) : null;

const convertRef: AstConvert<ts.TypeReferenceNode> = (context, schema) => {
  if (isReferenceObject(schema)) {
    const name = schema.$ref.split('/').reverse()[0];
    if (context.identifiers?.[name]) {
      return document(context, Type.Referance(name));
    } else {
      const refered = context.refs[schema.$ref] || context.root;
      const node = refered
        ? convertSchema(withIdentifier(context, Type.Alias({ name, type: Type.Any })), refered)
        : document(context, Type.Any);

      const entry = ts.isTypeLiteralNode(node.type)
        ? Type.Interface({ name, props: [...node.type.members], isExport: true })
        : Type.Alias({ name, type: node.type, isExport: true });

      return document(withIdentifier(node.context, entry), Type.Referance(entry.name));
    }
  } else {
    return null;
  }
};

const areAllPropertiesRequired = ({ properties, required }: SchemaObject): boolean => {
  return properties !== undefined && required !== undefined
    ? Object.keys(properties).every((name) => required.includes(name))
    : false;
};

const convertAdditionalPropertiesSchema = (
  context: AstContext,
  schema: SchemaObject,
): Document<ts.TypeNode, AstContext> => {
  if (isSchemaObject(schema.additionalProperties)) {
    const converted = convertSchema(context, schema.additionalProperties);
    return document(
      converted.context,
      areAllPropertiesRequired(schema) ? converted.type : Type.Union([converted.type, Type.Undefined]),
    );
  } else if (schema.additionalProperties !== false) {
    return document(context, Type.Unknown);
  }
  return document(context, Type.Void);
};

const convertObject: AstConvert<ts.TypeLiteralNode> = (context, schema) => {
  if (isSchemaObject(schema) && schema.properties !== undefined) {
    const additional = convertAdditionalPropertiesSchema(context, schema);

    const props = mapWithContext(
      additional.context,
      Object.entries(schema.properties),
      (propContext, [name, value]) => {
        const propSchema = getReferencedObject(value, isSchemaObject, 'schema', propContext);
        const item = convertSchema(propContext, value);
        const isOptional =
          !(Array.isArray(schema.required) && schema.required.includes(name)) && propSchema.default === undefined;
        return document(item.context, Type.Prop({ name, type: item.type, isOptional, jsDoc: propSchema.description }));
      },
    );

    return document(
      props.context,
      Type.TypeLiteral({
        props: props.items,
        index:
          additional.type === Type.Void
            ? undefined
            : Type.Index({ name: 'key', nameType: Type.String, type: additional.type }),
      }),
    );
  } else {
    return null;
  }
};

const convertOneOf: AstConvert<ts.UnionTypeNode> = (context, schema) => {
  if (isSchemaObject(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const schemas = mapWithContext(context, schema.oneOf, convertSchema);
    return document(schemas.context, Type.Union(schemas.items));
  } else {
    return null;
  }
};

const convertAnyOf: AstConvert<ts.UnionTypeNode> = (context, schema) => {
  if (isSchemaObject(schema) && schema.anyOf && Array.isArray(schema.anyOf)) {
    const schemas = mapWithContext(context, schema.anyOf, convertSchema);
    return document(schemas.context, Type.Union(schemas.items));
  } else {
    return null;
  }
};

const convertAllOf: AstConvert<ts.IntersectionTypeNode> = (context, schema) => {
  if (isSchemaObject(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    const schemas = mapWithContext(context, schema.allOf, convertSchema);
    return document(schemas.context, Type.Intersection(schemas.items));
  } else {
    return null;
  }
};

const convertArray: AstConvert<ts.ArrayTypeNode | ts.TupleTypeNode> = (context, schema) => {
  if (isSchemaObject(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        const schemas = mapWithContext(context, schema.items, convertSchema);
        return document(schemas.context, Type.Tuple(schemas.items));
      } else {
        const schemaItems = schema.items.concat(isSchemaObject(schema.additionalItems) ? [schema.additionalItems] : []);
        const items = mapWithContext(context, schemaItems, convertSchema);

        return document(items.context, Type.Array(Type.Union(items.items)));
      }
    } else {
      const value = schema.items ? convertSchema(context, schema.items) : document(context, Type.Any);
      return document(value.context, Type.Array(value.type));
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

export const convertSchema = (context: AstContext, schema: unknown): Document<ts.TypeNode, AstContext> =>
  converters.reduce<Document<ts.TypeNode, AstContext> | null>(
    (node, converter) => node || converter(context, schema),
    null,
  ) || document(context, Type.Any);

export const schemaTs = async (api: Schema | string): Promise<string> => {
  const { schema, refs } = await compile(api);

  return printDocument(convertSchema({ root: schema as SchemaObject, refs }, schema));
};
