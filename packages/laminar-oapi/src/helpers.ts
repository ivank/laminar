const escapeRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

export const toMatchPattern = (match: string) =>
  match
    .split('/')
    .map(part => (part === '*' ? '[^\\/]*' : escapeRegExp(part)))
    .join('\\/');

export const merge = <T extends {}>(objects: T[]) =>
  objects.reduce<T>((a, b) => ({ ...a, ...b }), {} as T);
