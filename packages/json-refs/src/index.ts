import fetch from 'node-fetch';
import { URL } from 'url';

interface Options {
  root: any;
  files: Map<string, any>;
  refs: Map<string, any>;
  id?: string;
}

const parseName = (name: string) => decodeURIComponent(name.replace('~1', '/').replace('~0', '~'));

const getRef = (ref: string, { files, root, id }: Options) => {
  const [url, path] = ref.split('#/');
  const resolvedUrl = new URL(url, id);
  const document = resolvedUrl ? files.get(resolvedUrl.toString()) : root;

  return path
    .split('/')
    .reduce((value, name) => (value ? value[parseName(name)] : undefined), document);
};

const resolveRef = (ref: string, options: Options) => {
  if (!options.refs.has(ref)) {
    options.refs.set(ref, getRef(ref, options));
  }
  return options.refs.get(ref);
};

const isRef = (item: any): item is { $ref: string } =>
  item && typeof item === 'object' && item.$ref && typeof item.$ref === 'string';

const extractUrls = (document: any): string[] =>
  Object.values(document).reduce<string[]>((urls, item) => {
    if (isRef(item)) {
      const [url] = item.$ref.split('#/');
      return url && !urls.includes(url) ? urls.concat([url]) : urls;
    } else if (typeof item === 'object') {
      const itemUrls = extractUrls(item).filter(url => !urls.includes(url));
      return urls.concat(itemUrls);
    } else {
      return urls;
    }
  }, []);

const loadJsonFiles = async (urls: string[]) => {
  const jsons = await Promise.all(urls.map(url => fetch(url).then(response => response.json())));

  return jsons.reduce<Map<string, any>>(
    (files, json, index) => files.set(urls[index], json),
    new Map(),
  );
};

export const resolveNestedRefs = (object: any, options: Options) => {
  const currentOptions = object.$id ? { ...options, id: object.$id } : options;
  if (object.$id) {
    options.files.set(object.$id, object);
  }

  for (const [key, item] of Object.entries(object)) {
    if (isRef(item)) {
      object[key] = resolveRef(item.$ref, currentOptions);
    } else if (typeof item === 'object') {
      object[key] = resolveNestedRefs(object[key], currentOptions);
    }
  }

  return isRef(object) ? resolveRef(object.$ref, currentOptions) : object;
};

export const resolveRefs = async (object: any): Promise<any> => {
  const options: Options = {
    refs: new Map(),
    files: await loadJsonFiles(extractUrls(object)),
    root: object,
  };

  return resolveNestedRefs(object, options);
};
