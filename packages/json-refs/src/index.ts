import fetch from 'node-fetch';
import { URL } from 'url';

export interface RefSchema {
  $ref: string;
}
export interface RefMap {
  [ref: string]: any;
}

interface TraversableSchema {
  [key: string]: any;
}

interface Context {
  schema: any;
  refs: RefMap;
}

export const isTraversable = (schema: any): schema is TraversableSchema =>
  schema && typeof schema === 'object';

export const getId = (schema: any): string | undefined => {
  if (isTraversable(schema)) {
    if ('$id' in schema && schema.$id && typeof schema.$id === 'string') {
      return schema.$id;
    } else if ('id' in schema && schema.id && typeof schema.id === 'string') {
      return schema.id;
    }
  }
  return undefined;
};

export const isRefSchema = (schema: any): schema is RefSchema =>
  isTraversable(schema) && '$ref' in schema && schema.$ref && typeof schema.$ref === 'string';

export const currentId = (schema: any, parentId?: string) => {
  const id = getId(schema);
  try {
    return id ? new URL(id, parentId).toString() : parentId;
  } catch (error) {
    return parentId;
  }
};

export const currentUrl = (url?: string, id?: string) => {
  try {
    return url ? new URL(url, id).toString() : undefined;
  } catch (error) {
    return undefined;
  }
};

export const reduceSchema = <TResult = any>(
  schema: any,
  cb: (all: TResult, item: any, id?: string) => TResult,
  initial: TResult,
  id?: string,
): TResult =>
  isTraversable(schema)
    ? Object.values(schema).reduce(
        (all, item) => reduceSchema(item, cb, all, currentId(schema, id)),
        cb(initial, schema, id),
      )
    : cb(initial, schema, id);

export const extractNamedRefs = (document: any): RefMap =>
  reduceSchema(
    document,
    (all, item, id) => {
      const itemId = getId(item);
      try {
        return itemId ? { ...all, [new URL(itemId, id).toString()]: item } : all;
      } catch (error) {
        return all;
      }
    },
    {},
  );

export const extractUrls = (schema: any, namedRefs: string[] = []) =>
  reduceSchema<string[]>(
    schema,
    (all, item, id) => {
      if (isRefSchema(item)) {
        const [url] = item.$ref.split('#');
        const fullUrl = currentUrl(url, id);

        if (fullUrl && !all.includes(fullUrl) && !namedRefs.includes(fullUrl)) {
          return [...all, fullUrl];
        }
      }
      return all;
    },
    [],
  );

export const extractFiles = async (schema: any): Promise<RefMap> => {
  const refs = extractNamedRefs(schema);
  const result = await Promise.all(
    extractUrls(schema, Object.keys(refs)).map(url =>
      fetch(url)
        .then(response => response.json())
        .then(content =>
          extractFiles(content).then(refMap => {
            refMap[url] = resolveNestedRefs(content, { schema: content, refs: refMap });
            return refMap;
          }),
        ),
    ),
  );
  return result.reduce((all, item) => ({ ...all, ...item }), refs);
};

export const parseJsonPointer = (name: string) =>
  decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

export const getJsonPointer = (document: any, pointer: string) =>
  pointer
    .split('/')
    .reduce<any>(
      (item, name) => (name ? (item ? item[parseJsonPointer(name)] : undefined) : item),
      document,
    );

export const resolveNestedRefs = (schema: any, context: Context, parentId?: string) => {
  const id = currentId(schema, parentId);

  if (isTraversable(schema)) {
    for (const [key, item] of Object.entries(schema)) {
      schema[key] = resolveNestedRefs(item, context, id);
    }
  }

  if (isRefSchema(schema)) {
    const [url, pointer] = schema.$ref.split('#');
    const fullUrl = currentUrl(url, id);
    const fullPointer = [fullUrl, pointer].join('#');
    if (!context.refs[fullPointer]) {
      const currentDocument = fullUrl ? context.refs[fullUrl] : context.schema;
      context.refs[fullPointer] = pointer
        ? getJsonPointer(currentDocument, pointer)
        : currentDocument;
    }

    return {
      $ref: fullPointer,
    };
  }

  return schema;
};

export const resolveRefs = async <TSchema = any>(original: TSchema) => {
  const copy: TSchema = JSON.parse(JSON.stringify(original));
  const context = { schema: copy, refs: await extractFiles(copy) };
  const schema: TSchema = resolveNestedRefs(copy, context);
  return {
    schema,
    refs: context.refs,
  };
};
