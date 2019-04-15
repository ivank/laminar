import { isRefSchema } from '@ovotech/json-refs';
import { JsonSchema, PrimitiveType, Schema } from '@ovotech/json-schema';
import * as ts from 'typescript';
import * as t from './ast';
import { AstContext, AstConvert, AstNode } from './types';

const isJsonSchema = (schema: any): schema is JsonSchema => schema && typeof schema === 'object';

export const astAny = (context: AstContext) => ({ type: t.anyType(), context });
export const astNone = (context: AstContext) => ({ type: null, context });
export const astTypeLiteral = (props: ts.TypeElement[], context: AstContext) => ({
  type: t.typeLiteral(props),
  context,
});

export const astUnion = (types: readonly ts.TypeNode[], context: AstContext) => ({
  type: t.unionType(types),
  context,
});

export const astMap = <T = any, TItem = any>(
  context: AstContext,
  items: T[],
  callbackfn: (item: T, context: AstContext) => AstNode<TItem>,
) =>
  items.reduce<{ items: TItem[]; context: AstContext }>(
    (all, item) => {
      const current = callbackfn(item, all.context);
      return {
        items: [...all.items, current.type],
        context: current.context,
      };
    },
    { items: [], context },
  );

export const astProp = (
  context: AstContext,
  name: string,
  optional: boolean,
  type: ts.TypeNode,
): AstNode<ts.PropertySignature> => ({ type: t.prop(name, optional, type), context });

export const withEntry = (
  name: string,
  entry: ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
  context: AstContext,
): AstContext => ({
  ...context,
  registry: {
    ...context.registry,
    [name]: entry,
  },
});

const nodeType = (type: PrimitiveType): ts.TypeNode => {
  switch (type) {
    case 'null':
      return t.nullType();
    case 'integer':
    case 'number':
      return t.numberType();
    case 'string':
      return t.stringType();
    case 'array':
      return t.arrayType(t.anyType());
    case 'object':
      return t.objectType();
    case 'boolean':
      return t.booleanType();
  }
};

const convertArrayType: AstConvert<ts.UnionTypeNode> = (schema, context) =>
  isJsonSchema(schema) && Array.isArray(schema.type)
    ? astUnion(schema.type.map(nodeType), context)
    : null;

const convertBooleanSchema: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  typeof schema === 'boolean'
    ? { context, type: schema === true ? t.anyType() : t.voidType() }
    : null;

const convertBoolean: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) && schema.type === 'boolean' ? { context, type: t.booleanType() } : null;

const convertString: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.minLength !== undefined ||
    schema.maxLength !== undefined)
    ? { context, type: t.stringType() }
    : null;

const convertNumber: AstConvert<ts.KeywordTypeNode> = (schema, context) =>
  isJsonSchema(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMinimum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? { context, type: t.numberType() }
    : null;

const astLiteral = (value: any): ts.TypeNode =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? t.literalType(value)
    : t.anyType();

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
    const identifier = schema.$ref.split('/').reverse()[0];
    if (context.registry[identifier]) {
      return { type: t.refType(identifier), context };
    } else {
      const refered = context.refs[schema.$ref] || context.root;

      const referedContext = withEntry(identifier, t.aliasType(identifier, t.anyType()), context);

      const referedNode: AstNode = refered
        ? convertSchema(refered, referedContext)
        : astAny(context);

      const entry = t.isLiteralType(referedNode.type)
        ? t.interfaceType(identifier, referedNode.type.members)
        : t.aliasType(identifier, referedNode.type);

      return {
        type: t.refType(entry.name),
        context: withEntry(identifier, entry, referedNode.context),
      };
    }
  } else {
    return null;
  }
};

const convertObject: AstConvert<ts.TypeLiteralNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.properties !== undefined) {
    const props = astMap(
      context,
      Object.entries(schema.properties),
      ([key, value], propContext) => {
        const item = convertSchema(value, propContext);
        const optional = !(Array.isArray(schema.required) && schema.required.includes(key));
        return astProp(item.context, key, optional, item.type);
      },
    );

    const additional = isJsonSchema(schema.additionalProperties)
      ? convertSchema(schema.additionalProperties, props.context)
      : schema.additionalProperties !== false
      ? astAny(props.context)
      : astNone(props.context);

    return astTypeLiteral(
      [...props.items, ...(additional.type ? [t.index(false, additional.type)] : [])],
      props.context,
    );
  } else {
    return null;
  }
};

const convertOneOf: AstConvert<ts.UnionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const schemas = astMap(context, schema.oneOf, convertSchema);
    return astUnion(schemas.items, schemas.context);
  } else {
    return null;
  }
};

const convertAnyOf: AstConvert<ts.UnionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.anyOf && Array.isArray(schema.anyOf)) {
    const schemas = astMap(context, schema.anyOf, convertSchema);
    return astUnion(schemas.items, schemas.context);
  } else {
    return null;
  }
};

const convertAllOf: AstConvert<ts.IntersectionTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    const schemas = astMap(context, schema.allOf, convertSchema);
    return { type: t.intersectionType(schemas.items), context: schemas.context };
  } else {
    return null;
  }
};

const convertArray: AstConvert<ts.TupleTypeNode | ts.ArrayTypeNode> = (schema, context) => {
  if (isJsonSchema(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        const schemas = astMap(context, schema.items, convertSchema);
        return { type: t.tupleType(schemas.items), context: schemas.context };
      } else {
        const items = astMap(
          context,
          schema.items.concat(isJsonSchema(schema.additionalItems) ? [schema.additionalItems] : []),
          convertSchema,
        );

        return { type: t.arrayType(t.unionType(items.items)), context: items.context };
      }
    } else {
      const value: AstNode = schema.items ? convertSchema(schema.items, context) : astAny(context);
      return { type: t.arrayType(value.type), context: value.context };
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

export const convertSchema = (schema: Schema, context: AstContext): AstNode =>
  converters.reduce<AstNode | null>((ast, converter) => ast || converter(schema, context), null) ||
  astAny(context);
