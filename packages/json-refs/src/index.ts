import fetch from 'node-fetch';
import { URL } from 'url';

interface RefSchema {
  $ref: string;
}
interface TraversableSchema {
  [key: string]: any;
}

interface FilesMap {
  [file: string]: any;
}

interface Context extends Options {
  schema: any;
  files: FilesMap;
}

interface Options {
  keepRefAs?: string;
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
  return id ? new URL(id, parentId).toString() : parentId;
};

export const currentUrl = (url?: string, id?: string) =>
  url ? new URL(url, id).toString() : undefined;

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

export const extractNamedRefs = (document: any): FilesMap =>
  reduceSchema(
    document,
    (all, item, id) => {
      const itemId = getId(item);
      return itemId ? { ...all, [new URL(itemId, id).toString()]: item } : all;
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

export const extractFiles = async (schema: any, options?: Options): Promise<FilesMap> => {
  const refs = extractNamedRefs(schema);
  const result = await Promise.all(
    extractUrls(schema, Object.keys(refs)).map(url =>
      fetch(url)
        .then(response => response.json())
        .then(content =>
          extractFiles(content).then(filesMap => ({
            ...filesMap,
            [url]: resolveNestedRefs(content, { ...options, schema: content, files: filesMap }),
          })),
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

export const decorateSchema = (schema: any, ref: string, keepRefAs?: string) =>
  isTraversable(schema) && ref && keepRefAs ? { ...schema, [keepRefAs]: ref } : schema;

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
    const currentDocument = fullUrl ? context.files[fullUrl] : context.schema;

    return pointer
      ? decorateSchema(getJsonPointer(currentDocument, pointer), schema.$ref, context.keepRefAs)
      : currentDocument;
  }

  return schema;
};

export const resolveRefs = async (original: any, options?: Options): Promise<any> => {
  const schema = JSON.parse(JSON.stringify(original));
  return resolveNestedRefs(schema, {
    ...options,
    schema,
    files: await extractFiles(schema, options),
  });
};
