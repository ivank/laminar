import { existsSync, readFileSync } from 'fs';
import * as YAML from 'yaml';
import { dirname, join } from 'path';
import { URL } from 'url';
import axios from 'axios';
import { ResolveError } from './ResolveError';
import { Schema } from './schema';

export interface RefMap {
  [ref: string]: Schema;
}

export interface ResolvedSchema<T extends Schema = Schema> {
  schema: T;
  refs: RefMap;
  uris: string[];
}

interface LoadedJsonObject {
  uri: string;
  content: Schema;
  cwd?: string;
}

interface TraversableSchema {
  [key: string]: Schema;
}

interface RefSchema {
  $ref: string;
  [key: string]: unknown;
}

interface RecursiveRefSchema {
  $recursiveRef: string;
  [key: string]: unknown;
}

interface Context {
  schema: Schema;
  refs: RefMap;
}

export interface FileContext {
  parentId?: string;
  cwd?: string;
  uris?: string[];
}

const isTraversable = (schema: unknown): schema is TraversableSchema => Boolean(schema && typeof schema === 'object');

const toUrl = (url: string, base?: string): string | undefined => {
  try {
    return new URL(url, base).toString();
  } catch (error) {
    return undefined;
  }
};

const getId = (schema: Schema): string | undefined => {
  if (isTraversable(schema)) {
    if ('$id' in schema && schema.$id && typeof schema.$id === 'string') {
      return schema.$id;
    } else if ('id' in schema && schema.id && typeof schema.id === 'string') {
      return schema.id;
    }
  }
  return undefined;
};

const getAnchor = (schema: Schema): string | undefined =>
  isTraversable(schema) && '$anchor' in schema && schema.$anchor && typeof schema.$anchor === 'string'
    ? schema.$anchor
    : undefined;

const isRefSchema = (schema: Schema): schema is RefSchema =>
  isTraversable(schema) && '$ref' in schema && schema.$ref !== undefined && typeof schema.$ref === 'string';

const isRecursiveRefSchema = (schema: Schema): schema is RecursiveRefSchema =>
  isTraversable(schema) &&
  '$recursiveRef' in schema &&
  schema.$recursiveRef !== undefined &&
  typeof schema.$recursiveRef === 'string';

const currentId = (schema: Schema, parentId?: string): string | undefined => {
  const id = getId(schema);
  return id ? toUrl(id, parentId) : parentId;
};

const currentUrl = (url?: string, { cwd, parentId }: FileContext = {}): string | undefined => {
  const fullUrl = url && toUrl(url, parentId);
  if (fullUrl) {
    return fullUrl;
  } else if (url && cwd) {
    if (!existsSync(join(cwd, url))) {
      throw new ResolveError(`File ${url} in ${cwd} does not exist`);
    }
    return url;
  } else {
    return undefined;
  }
};

const reduceSchema = <TResult = Schema>(
  schema: Schema,
  cb: (all: TResult, item: Schema, id?: string) => TResult,
  initial: TResult,
  id?: string,
): TResult =>
  isTraversable(schema)
    ? Object.values(schema).reduce(
        (all, item) => reduceSchema(item, cb, all, currentId(schema, id)),
        cb(initial, schema, id),
      )
    : cb(initial, schema, id);

export const extractNamedRefs = (document: Schema): RefMap =>
  reduceSchema(
    document,
    (all, item, id) => {
      const itemId = getId(item);
      const anchorId = getAnchor(item);
      const url = anchorId
        ? [itemId ? toUrl(itemId, id) : id, anchorId].join('#')
        : itemId
        ? toUrl(itemId, id) ?? itemId
        : undefined;
      return url ? { ...all, [url]: item } : all;
    },
    {},
  );

export const extractUrls = (schema: Schema, namedRefs: string[] = [], fileContext: FileContext = {}): string[] => {
  const namedRefsAsUrls = namedRefs.map((ref) => toUrl(ref)?.split('#')[0] ?? ref);
  return reduceSchema<string[]>(
    schema,
    (all, item, parentId) => {
      if (isRefSchema(item) || isRecursiveRefSchema(item)) {
        const [url] = (isRefSchema(item) ? item.$ref : item.$recursiveRef).split('#');
        const fullUrl = currentUrl(url, { ...fileContext, parentId });
        if (fullUrl && !all.includes(fullUrl) && !namedRefsAsUrls.includes(fullUrl)) {
          return [...all, fullUrl];
        }
      }
      return all;
    },
    [],
  );
};

const loadFile = async (uri: string, { cwd }: FileContext = {}): Promise<LoadedJsonObject> => {
  const url = toUrl(uri);
  if (url && !url.startsWith('file://')) {
    const { data } = await axios.get(uri);
    return { uri: url, content: typeof data === 'string' ? YAML.parse(data) : data };
  } else {
    const localUri = uri.startsWith('file://') ? uri.slice(7) : uri;
    const file = cwd ? join(cwd, localUri) : localUri;
    const content = readFileSync(file, 'utf8');
    const newCwd = dirname(file);

    if (localUri.endsWith('.yaml') || localUri.endsWith('.yml')) {
      return { uri: `file://${file}`, content: YAML.parse(content), cwd: newCwd };
    } else {
      return { uri: `file://${file}`, content: JSON.parse(content), cwd: newCwd };
    }
  }
};

const parseJsonPointer = (name: string): string => decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

const getJsonPointer = (document: Schema, pointer: string): Schema | undefined =>
  pointer
    .split('/')
    .reduce<Schema | undefined>(
      (item, name) => (name ? (isTraversable(item) ? item[parseJsonPointer(name)] : undefined) : item),
      document,
    );

const resolveNestedRefs = (schema: Schema, context: Context, fileContext: FileContext = {}): Schema => {
  const parentId = currentId(schema, fileContext.parentId);

  if (isTraversable(schema)) {
    for (const [key, item] of Object.entries(schema)) {
      schema[key] = resolveNestedRefs(item, context, { ...fileContext, parentId });
    }
  }

  if (isRecursiveRefSchema(schema)) {
    const { $recursiveRef, ...restSiblings } = schema as RecursiveRefSchema;
    const [url, pointer] = $recursiveRef.split('#');
    const fullUrl = currentUrl(url, { ...fileContext, parentId });

    const currentDocument = fullUrl ? context.refs[fullUrl] : context.schema;
    const newContent = pointer ? getJsonPointer(currentDocument, pointer) : currentDocument;
    if (
      newContent !== undefined &&
      typeof newContent !== 'boolean' &&
      newContent.$id &&
      newContent.$recursiveAnchor === true
    ) {
      const anchorPointer = [newContent.$id, pointer].join('#');
      if (!context.refs[anchorPointer]) {
        context.refs[anchorPointer] = newContent;
      }
      return { $ref: anchorPointer, ...restSiblings };
    }
  } else if (isRefSchema(schema)) {
    const { $ref, ...restSiblings } = schema as RefSchema;
    const [url, pointer] = $ref.split('#');

    const fullUrl = currentUrl(url, { ...fileContext, parentId });
    const fullPointer = [fullUrl, pointer].join('#');

    if (!context.refs[fullPointer]) {
      const currentDocument = fullUrl ? context.refs[fullUrl] : context.schema;
      const newContent = pointer ? getJsonPointer(currentDocument, pointer) : currentDocument;
      if (newContent !== undefined) {
        context.refs[fullPointer] = newContent;
      }
    }

    return { $ref: fullPointer, ...restSiblings };
  }

  return schema;
};

export const extractFiles = async (
  schema: Schema,
  options: FileContext = {},
): Promise<{ refs: RefMap; uris: string[] }> => {
  const initialRefs = extractNamedRefs(schema);

  let result: { refs: RefMap; uris: string[] } = { uris: options.uris ?? [], refs: initialRefs };
  for (const url of extractUrls(schema, Object.keys(initialRefs), options)) {
    const { content, cwd, uri } = await loadFile(url, options);
    if (!result.uris?.includes(uri)) {
      const { refs, uris } = await extractFiles(content, { cwd, uris: [...result.uris, uri] });
      const ref = resolveNestedRefs(content, { schema: content, refs }, { cwd });
      result = { uris, refs: { ...result.refs, ...refs, [url]: ref } };
    } else {
      const ref = resolveNestedRefs(content, { schema: content, refs: result.refs }, { cwd });
      result = { uris: result.uris, refs: { ...result.refs, [url]: ref } };
    }
  }
  return result;
};

export const resolve = async (original: Schema, fileContext: FileContext = {}): Promise<ResolvedSchema> => {
  const copy: Schema = JSON.parse(JSON.stringify(original));
  const { refs, uris } = await extractFiles(copy, fileContext);
  const context = { schema: copy, refs, uris };
  const schema = resolveNestedRefs(copy, context, fileContext);
  return { schema, refs, uris };
};

export const resolveFile = async (file: string): Promise<ResolvedSchema> => {
  const { content, cwd, uri } = await loadFile(file);
  const resolved = await resolve(content, { cwd });
  return { ...resolved, uris: [uri, ...resolved.uris] };
};

export const compile = async (schema: Schema | string): Promise<ResolvedSchema> =>
  typeof schema === 'string' ? resolveFile(schema) : resolve(schema);

export const toSchemaObject = <T extends Schema = Schema>(schema: ResolvedSchema<T>): T => schema.schema;

/**
 * Get a schema within the context of refs and uris of another compiled schema
 */
export const withinContext = <T extends Schema = Schema>(
  schema: T,
  contextSchema: ResolvedSchema,
): ResolvedSchema<T> => ({ ...contextSchema, schema });

export const isCompiled = (schema: Schema | ResolvedSchema | string): schema is ResolvedSchema =>
  typeof schema === 'object' && 'schema' in schema && 'refs' in schema && 'uris' in schema;
