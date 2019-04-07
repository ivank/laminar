const escapeRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

export const toMatchPattern = (match: string) =>
  match
    .split('/')
    .map(part => (part === '*' ? '[^\\/]*' : escapeRegExp(part)))
    .join('\\/');
