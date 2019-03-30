import fetch from 'node-fetch';

interface Options {
  root: any;
  files: Map<string, any>;
  refs: Map<string, any>;
}

export const getRef = async (ref: string, { files, root }: Options) => {
  const [url, path] = ref.split('#/');
  const document = url ? files.get(url) : root;

  return path.split('/').reduce((value, name) => (value ? value[name] : undefined), document);
};

export const resolveRef = async (ref: string, options: Options) => {
  if (!options.refs.has(ref)) {
    options.refs.set(ref, await getRef(ref, options));
  }
  return options.refs.get(ref);
};

export const isRef = (item: any): item is { $ref: string } =>
  item &&
  typeof item === 'object' &&
  item.$ref &&
  typeof item.$ref === 'string' &&
  item.$ref.includes('#/');

export const extractUrls = (document: any): string[] =>
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

export const loadJsonFiles = async (urls: string[]) => {
  const jsons = await Promise.all(urls.map(url => fetch(url).then(response => response.json())));

  return jsons.reduce<Map<string, any>>(
    (files, json, index) => files.set(urls[index], json),
    new Map(),
  );
};

export const resolveRefs = async (object: any, initOptions?: Options): Promise<any> => {
  const options = initOptions || {
    refs: new Map(),
    files: await loadJsonFiles(extractUrls(object)),
    root: object,
  };

  for (const [key, item] of Object.entries(object)) {
    if (isRef(item)) {
      object[key] = await resolveRef(item.$ref, options);
    } else if (typeof item === 'object') {
      object[key] = await resolveRefs(object[key], options);
    }
  }

  return object;
};
