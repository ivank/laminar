import { isRefSchema } from '@ovotech/json-refs';
import { Type } from '@ovotech/ts-compose';
import { SchemaObject } from 'openapi3-ts';
import * as ts from 'typescript';
import {
  AstContext,
  AstConvert,
  isSchema,
  mapContext,
  result,
  Result,
  withEntry,
} from './traverse';

const nodeType = (type: string) => {
  switch (type) {
    case 'null':
      return Type.Null;
    case 'integer':
    case 'number':
      return Type.Num;
    case 'string':
      return Type.Str;
    case 'array':
      return Type.Arr(Type.Any);
    case 'object':
      return Type.Obj;
    case 'boolean':
      return Type.Bool;
    default:
      return Type.Any;
  }
};

const convertArrayType: AstConvert<ts.UnionTypeNode> = (context, schema) =>
  isSchema(schema) && Array.isArray(schema.type)
    ? result(context, Type.Union(schema.type.map(nodeType)))
    : null;

const convertBooleanSchema: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  typeof schema === 'boolean' ? result(context, schema === true ? Type.Any : Type.Void) : null;

const convertBoolean: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchema(schema) && schema.type === 'boolean' ? result(context, Type.Bool) : null;

const convertString: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchema(schema) &&
  (schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.minLength !== undefined ||
    schema.maxLength !== undefined)
    ? result(context, Type.Str)
    : null;

const convertNumber: AstConvert<ts.KeywordTypeNode> = (context, schema) =>
  isSchema(schema) &&
  (schema.type === 'integer' ||
    schema.type === 'number' ||
    schema.minimum !== undefined ||
    schema.exclusiveMinimum !== undefined ||
    schema.maximum !== undefined ||
    schema.exclusiveMaximum !== undefined)
    ? result(context, Type.Num)
    : null;

const convertEnum: AstConvert<ts.UnionTypeNode> = (context, schema) =>
  isSchema(schema) && schema.enum && Array.isArray(schema.enum)
    ? result(context, Type.Union(schema.enum.map(Type.Literal)))
    : null;

const convertConst: AstConvert = (context, schema) =>
  isSchema(schema) && schema.const !== undefined
    ? result(context, Type.Literal(schema.const))
    : null;

const convertRef: AstConvert<ts.TypeReferenceNode> = (context, schema) => {
  if (isSchema(schema) && isRefSchema(schema)) {
    const name = schema.$ref.split('/').reverse()[0];
    if (context.registry[name]) {
      return result(context, Type.Ref(name));
    } else {
      const refered = context.refs[schema.$ref] || context.root;
      const node = refered
        ? convertSchema(withEntry(context, Type.Alias({ name, type: Type.Any })), refered)
        : result(context, Type.Any);

      const entry = ts.isTypeLiteralNode(node.type)
        ? Type.Interface({ name, props: [...node.type.members] })
        : Type.Alias({ name, type: node.type });

      return result(withEntry(node.context, entry), Type.Ref(entry.name));
    }
  } else {
    return null;
  }
};

const convertObject: AstConvert<ts.TypeLiteralNode> = (context, schema) => {
  if (isSchema(schema) && schema.properties !== undefined) {
    const additional = isSchema(schema.additionalProperties)
      ? convertSchema(context, schema.additionalProperties)
      : schema.additionalProperties !== false
      ? result(context, Type.Any)
      : result(context, Type.Void);

    const props = mapContext(
      additional.context,
      Object.entries(schema.properties),
      (propContext, [name, value]) => {
        const item = convertSchema(propContext, value);
        const isOptional = !(Array.isArray(schema.required) && schema.required.includes(name));

        return result(
          item.context,
          Type.Prop({
            name,
            type: item.type,
            isOptional,
            jsDoc: !isRefSchema(value) ? value.description : undefined,
          }),
        );
      },
    );

    return result(
      props.context,
      Type.TypeLiteral({
        props: props.items,
        index:
          additional.type.kind === ts.SyntaxKind.VoidKeyword
            ? undefined
            : Type.Index({ name: 'key', nameType: Type.Str, type: additional.type }),
      }),
    );
  } else {
    return null;
  }
};

const convertOneOf: AstConvert<ts.UnionTypeNode> = (context, schema) => {
  if (isSchema(schema) && schema.oneOf && Array.isArray(schema.oneOf)) {
    const schemas = mapContext(context, schema.oneOf, convertSchema);
    return result(schemas.context, Type.Union(schemas.items));
  } else {
    return null;
  }
};

const convertAnyOf: AstConvert<ts.UnionTypeNode> = (context, schema) => {
  if (isSchema(schema) && schema.anyOf && Array.isArray(schema.anyOf)) {
    const schemas = mapContext(context, schema.anyOf, convertSchema);
    return result(schemas.context, Type.Union(schemas.items));
  } else {
    return null;
  }
};

const convertAllOf: AstConvert<ts.IntersectionTypeNode> = (context, schema) => {
  if (isSchema(schema) && schema.allOf && Array.isArray(schema.allOf)) {
    const schemas = mapContext(context, schema.allOf, convertSchema);
    return result(schemas.context, Type.Intersection(schemas.items));
  } else {
    return null;
  }
};

const convertArray: AstConvert<ts.ArrayTypeNode | ts.TupleTypeNode> = (context, schema) => {
  if (isSchema(schema) && (schema.items || schema.maxItems || schema.minItems)) {
    if (schema.items && Array.isArray(schema.items)) {
      if (schema.additionalItems === false) {
        const schemas = mapContext(context, schema.items, convertSchema);
        return result(schemas.context, Type.Tuple(schemas.items));
      } else {
        const schemaItems = schema.items.concat(
          isSchema(schema.additionalItems) ? [schema.additionalItems] : [],
        );
        const items = mapContext(context, schemaItems, convertSchema);

        return result(items.context, Type.Arr(Type.Union(items.items)));
      }
    } else {
      const value = schema.items ? convertSchema(context, schema.items) : result(context, Type.Any);
      return result(value.context, Type.Arr(value.type));
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

export const convertSchema = (context: AstContext, schema: SchemaObject): Result =>
  converters.reduce<Result | null>((node, converter) => node || converter(context, schema), null) ||
  result(context, Type.Any);
