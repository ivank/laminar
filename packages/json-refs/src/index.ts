import fetch from 'node-fetch';
import { URL } from 'url';

interface IdSchema {
  $id: string;
}
interface RefSchema {
  $ref: string;
}
interface TraversableSchema {
  [key: string]: any;
}

interface FilesMap {
  [file: string]: any;
}

interface Context {
  schema: any;
  files: FilesMap;
}

export const isTraversable = (schema: any): schema is TraversableSchema =>
  schema && typeof schema === 'object';

export const isIdSchema = (schema: any): schema is IdSchema =>
  isTraversable(schema) && '$id' in schema && schema.$id;

export const isRefSchema = (schema: any): schema is RefSchema =>
  isTraversable(schema) && '$ref' in schema && schema.$ref;

export const currentId = (schema: any, parentId?: string) =>
  isIdSchema(schema) ? new URL(schema.$id, parentId).toString() : parentId;

export const currentUrl = (url: string | undefined, id?: string) =>
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
    (all, item, id) =>
      isIdSchema(item) ? { ...all, [new URL(item.$id, id).toString()]: item } : all,
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

export const extractFiles = async (schema: any): Promise<FilesMap> => {
  const refs = extractNamedRefs(schema);
  const result = await Promise.all(
    extractUrls(schema, Object.keys(refs)).map(url =>
      fetch(url)
        .then(response => response.json())
        .then(content => extractFiles(content).then(filesMap => ({ ...filesMap, [url]: content }))),
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
    const currentDocument = fullUrl ? context.files[fullUrl] : context.schema;

    return pointer ? getJsonPointer(currentDocument, pointer) : currentDocument;
  }

  return schema;
};

export const resolveRefs = async (schema: any): Promise<any> =>
  resolveNestedRefs(schema, { schema, files: await extractFiles(schema) });
